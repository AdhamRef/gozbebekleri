import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = await Promise.resolve(params.id);
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        donor: {
          select: {
            name: true,
            email: true,
            phone: true,
            country: true,
          },
        },
        items: {
          include: {
            campaign: {
              select: {
                title: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    if (session.user.role !== 'ADMIN' && session.user.id !== donation.donorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header
    doc.setFillColor(0, 123, 255);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text('Donation Receipt', 105, 20, { align: 'center' });
    doc.setFontSize(18);
    doc.text('إيصال التبرع', 105, 35, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Receipt details
    const startY = 50;
    let currentY = startY;

    // Helper function for text
    const addText = (text: string, x: number, y: number, options?: any) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(text, x, y, options);
    };

    // Receipt ID and Date
    addText(`Receipt ID / رقم الإيصال: ${donation.id}`, 20, currentY);
    
    currentY += 10;
    const formattedDate = format(new Date(donation.createdAt), 'PPP', { locale: arSA });
    addText(`Date / التاريخ: ${formattedDate}`, 20, currentY);

    // Donor Information
    currentY += 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    addText('Donor Information / معلومات المتبرع', 20, currentY);

    currentY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    addText(`Name / الاسم: ${donation.donor.name}`, 20, currentY);
    
    currentY += 10;
    addText(`Email / البريد الإلكتروني: ${donation.donor.email}`, 20, currentY);

    if (donation.donor.phone) {
      currentY += 10;
      addText(`Phone / الهاتف: ${donation.donor.phone}`, 20, currentY);
    }

    if (donation.donor.country) {
      currentY += 10;
      addText(`Country / الدولة: ${donation.donor.country}`, 20, currentY);
    }

    // Donation Details
    currentY += 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    addText('Donation Details / تفاصيل التبرع', 20, currentY);

    currentY += 10;
    // Add table header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, currentY, 170, 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('Campaign / الحملة', 25, currentY + 6);
    doc.text('Amount / المبلغ', 160, currentY + 6, { align: 'right' });

    currentY += 8;
    doc.setFont("helvetica", "normal");

    // Donation items
    donation.items.forEach((item) => {
      doc.text(item.campaign.title, 25, currentY + 6);
      doc.text(`$${item.amount.toFixed(2)}`, 160, currentY + 6, { align: 'right' });
      currentY += 8;
    });

    // Summary section
    currentY += 5;
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // Helper function for summary items
    const addSummaryItem = (label: string, arabicLabel: string, amount: number) => {
      doc.text(`${label} / ${arabicLabel}:`, 130, currentY);
      doc.text(`$${amount.toFixed(2)}`, 160, currentY, { align: 'right' });
      return currentY += 10;
    };

    currentY = addSummaryItem('Subtotal', 'المجموع الفرعي', donation.amount);

    if (donation.teamSupport > 0) {
      currentY = addSummaryItem('Team Support', 'دعم الفريق', donation.teamSupport);
    }

    if (donation.fees > 0) {
      currentY = addSummaryItem('Fees', 'الرسوم', donation.fees);
    }

    // Total
    doc.setFont("helvetica", "bold");
    currentY += 5;
    doc.line(130, currentY, 190, currentY);
    currentY += 10;
    const total = donation.amount + (donation.teamSupport || 0) + (donation.fees || 0);
    doc.text('Total / المجموع:', 130, currentY);
    doc.text(`$${total.toFixed(2)}`, 160, currentY, { align: 'right' });

    // Thank you message
    currentY += 30;
    doc.setFont("helvetica", "italic");
    doc.text('Thank you for your donation! / شكراً لتبرعكم', 105, currentY, { align: 'center' });

    // Generate PDF
    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="donation-receipt-${donation.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 });
  }
}