import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';

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

    // Only allow users to view their own profile or admins to view any profile
    if (session.user.role !== 'ADMIN' && session.user.id !== id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        donations: {
          include: {
            subscription: { select: { status: true } },
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

    const withType = (d: typeof user.donations[0], type: 'ONE_TIME' | 'MONTHLY') => ({
      ...d,
      type,
      status: type === 'MONTHLY' ? (d.subscription?.status ?? null) : null,
    });

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

    // Only allow users to update their own profile or admins to update any profile
    if (session.user.role !== 'ADMIN' && session.user.id !== id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, country, phone, birthdate, role, preferredLang } = body;

    // Only admins can change roles
    if (role && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can change user roles' },
        { status: 403 }
      );
    }

    // Check if email is being changed and already exists
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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(country !== undefined && { country }),
        ...(phone !== undefined && { phone }),
        ...(birthdate !== undefined && { birthdate }),
        ...(role && { role }),
        ...(preferredLang !== undefined && { preferredLang: preferredLang === '' ? null : preferredLang }),
      },
    });

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
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
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