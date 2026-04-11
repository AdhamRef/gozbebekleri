import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import {
  sanitizeDashboardPermissions,
  userCanViewUserProfilesInDashboard,
} from '@/lib/dashboard/permissions';
import { requireAdminSession } from '@/lib/dashboard/api-auth';
import { writeAuditLog } from '@/lib/audit-log';

function roleLabelAr(r: string) {
  if (r === 'ADMIN') return 'مدير';
  if (r === 'STAFF') return 'طاقم';
  return 'متبرع';
}

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const canViewOthers =
      session.user.role === 'ADMIN' ||
      userCanViewUserProfilesInDashboard(session.user);
    if (!canViewOthers && session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        donations: {
          include: {
            subscription: {
              select: {
                id: true,
                status: true,
                billingDay: true,
                nextBillingDate: true,
              },
            },
            items: {
              include: {
                campaign: {
                  select: {
                    title: true,
                    images: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { donations: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const oneTimeDonations = user.donations.filter((d) => d.subscriptionId == null);
    const monthlyDonations = user.donations.filter((d) => d.subscriptionId != null);

    const withType = (d: typeof user.donations[0], type: 'ONE_TIME' | 'MONTHLY') => {
      const sub = d.subscription;
      return {
        ...d,
        type,
        /** Donation charge status (PAID / FAILED / PENDING) — unchanged for revenue totals */
        paymentStatus: d.status,
        status: type === 'MONTHLY' ? (sub?.status ?? null) : d.status,
        billingDay: type === 'MONTHLY' ? (sub?.billingDay ?? null) : null,
        nextBillingDate: type === 'MONTHLY' ? (sub?.nextBillingDate ?? null) : null,
      };
    };

    const donationsForUser = [
      ...oneTimeDonations.map((d) => withType(d, 'ONE_TIME')),
      ...monthlyDonations.map((d) => withType(d, 'MONTHLY')),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      user: { ...user, donations: donationsForUser },
      oneTimeDonations: oneTimeDonations.map((d) => withType(d, 'ONE_TIME')),
      monthlyDonations: monthlyDonations.map((d) => withType(d, 'MONTHLY')),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      country,
      countryCode,
      countryName,
      region,
      city,
      phone,
      birthdate,
      role,
      preferredLang,
      dashboardPermissions: rawDashboardPermissions,
    } = body;

    const isSelf = session.user.id === id;
    const wantsAuthorityChange =
      role !== undefined || rawDashboardPermissions !== undefined;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        role: true,
        dashboardPermissions: true,
        name: true,
        email: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (wantsAuthorityChange && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can change roles or dashboard access' },
        { status: 403 }
      );
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: {
            id,
          },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    let nextDashboardPermissions: string[] | undefined;

    if (
      isAdmin &&
      (role !== undefined || rawDashboardPermissions !== undefined)
    ) {
      const effectiveRole = role ?? existing.role;

      if (role !== undefined) {
        if (role === 'STAFF') {
          nextDashboardPermissions =
            rawDashboardPermissions !== undefined
              ? sanitizeDashboardPermissions(rawDashboardPermissions)
              : (existing.dashboardPermissions ?? []);
          if (nextDashboardPermissions.length === 0) {
            return NextResponse.json(
              {
                error:
                  'Staff members need at least one dashboard section enabled',
              },
              { status: 400 }
            );
          }
        } else {
          nextDashboardPermissions = [];
        }
      } else if (
        rawDashboardPermissions !== undefined &&
        effectiveRole === 'STAFF'
      ) {
        nextDashboardPermissions = sanitizeDashboardPermissions(
          rawDashboardPermissions
        );
        if (nextDashboardPermissions.length === 0) {
          return NextResponse.json(
            {
              error:
                'Staff members need at least one dashboard section enabled',
            },
            { status: 400 }
          );
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(countryCode !== undefined && {
          countryCode: countryCode === "" ? null : countryCode,
        }),
        ...(countryName !== undefined && {
          countryName: countryName === "" ? null : countryName,
          ...(country === undefined && {
            country: countryName === "" ? null : countryName,
          }),
        }),
        ...(country !== undefined && {
          country: country === "" ? null : country,
          ...(countryName === undefined && {
            countryName: country === "" ? null : country,
          }),
        }),
        ...(region !== undefined && { region: region === "" ? null : region }),
        ...(city !== undefined && { city: city === "" ? null : city }),
        ...(phone !== undefined && { phone }),
        ...(birthdate !== undefined && { birthdate }),
        ...(role !== undefined && { role }),
        ...(preferredLang !== undefined && {
          preferredLang: preferredLang === '' ? null : preferredLang,
        }),
        ...(nextDashboardPermissions !== undefined && {
          dashboardPermissions: nextDashboardPermissions,
        }),
      },
    });

    if (isAdmin && wantsAuthorityChange) {
      const actor = session.user;
      const targetName = existing.name ?? existing.email ?? id;
      const newR = role ?? existing.role;
      await writeAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role ?? 'ADMIN',
        action: 'USER_AUTHORITY_UPDATE',
        messageAr: `${actor.name ?? 'مدير'} عدّل صلاحيات ${targetName}: الدور ${roleLabelAr(newR)}`,
        messageEn: `${actor.name ?? 'Admin'} updated authority for ${targetName} → ${newR}`,
        entityType: 'User',
        entityId: id,
        metadata: {
          role: newR,
          dashboardPermissions: updatedUser.dashboardPermissions,
        },
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const adminDenied = requireAdminSession(session);
    if (adminDenied) return adminDenied;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.donation.deleteMany({ where: { donorId: id } });
      await tx.subscription.deleteMany({ where: { donorId: id } });
      await tx.user.delete({ where: { id } });
    });

    const actor = session!.user;
    await writeAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role ?? 'ADMIN',
      action: 'USER_DELETE',
      messageAr: `${actor.name ?? 'مدير'} حذف المستخدم ${user.name ?? user.email ?? id}`,
      messageEn: `${actor.name ?? 'Admin'} deleted user ${user.email}`,
      entityType: 'User',
      entityId: id,
    });

    return NextResponse.json(
      { message: 'User, donations and subscriptions deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
