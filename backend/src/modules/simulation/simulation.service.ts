import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { ORDER_STATUS, APPLICATION_STATUS } from '../../common/constants/enums';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private formatIDR(amount: number): string {
    return `Rp${amount.toLocaleString('id-ID')}`;
  }

  private async updateTimeline(
    orderId: string,
    status: string,
    userId: string,
    note: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { timeline: true },
    });

    let timelineEntries = [];
    if (order?.timeline) {
      try {
        timelineEntries = JSON.parse(order.timeline as string);
      } catch (e) {
        timelineEntries = [];
      }
    }

    timelineEntries.push({
      status,
      at: new Date().toISOString(),
      by: userId,
      note,
    });

    return JSON.stringify(timelineEntries);
  }

  // ✅ Setiap 12 detik - Simulasi order untuk jasa baru
  @Cron('*/12 * * * * *')
  async simulateNewOrderForServices() {
    this.logger.debug('🔍 Checking for new services to simulate orders...');

    const services = await this.prisma.service.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
        simulationOrderCreatedAt: null,
        isActive: true,
      },
      include: {
        seller: true,
        category: true,
      },
      take: 1,
    });

    for (const service of services) {
      this.logger.log(
        `🎮 SIMULASI: Membuat order otomatis untuk jasa "${service.title}"`,
      );

      const dummyBuyer = await this.prisma.user.findFirst({
        where: {
          id: { not: service.sellerId },
          role: 'USER',
          emailVerified: true,
        },
      });

      if (!dummyBuyer) {
        this.logger.warn(`⚠️ No dummy buyer found for service ${service.id}`);
        continue;
      }

      const fee = Math.round(service.price * 0.05);
      const total = service.price + fee;

      const initialTimeline = JSON.stringify([
        {
          status: 'WAITING_CONFIRMATION',
          at: new Date().toISOString(),
          by: dummyBuyer.id,
          note: 'Order dibuat otomatis oleh sistem simulasi',
        },
      ]);

      const order = await this.prisma.order.create({
        data: {
          buyerId: dummyBuyer.id,
          sellerId: service.sellerId,
          serviceId: service.id,
          title: service.title,
          amount: service.price,
          fee,
          totalAmount: total,
          status: 'WAITING_CONFIRMATION',
          deliveryType: 'DIGITAL',
          //   simulationOrderCreatedAt: new Date(),
          timeline: initialTimeline,
        },
      });

      this.logger.log(`✅ Order ${order.id} created for service ${service.id}`);

      // ✅ NOTIFIKASI KE SELLER (pemilik jasa)
      await this.notificationsService.notify(
        service.sellerId,
        'ORDER',
        '📦 Ada Pesanan Baru (Simulasi)',
        `Seseorang memesan jasa "${service.title}" seharga ${this.formatIDR(service.price)}. Klik untuk memproses.`,
        { orderId: order.id, serviceId: service.id },
        `/orders/${order.id}`, // ✅ Redirect ke detail order
      );

      // ✅ NOTIFIKASI KE BUYER (dummy)
      await this.notificationsService.notify(
        dummyBuyer.id,
        'ORDER',
        '✅ Pesanan Berhasil Dibuat (Simulasi)',
        `Anda telah memesan jasa "${service.title}" seharga ${this.formatIDR(service.price)}.`,
        { orderId: order.id, serviceId: service.id },
        `/orders/${order.id}`,
      );
    }
  }

  // ✅ Setiap 10 detik - Simulasi lamaran untuk job baru
  @Cron('*/10 * * * * *')
  async simulateNewApplicationForJobs() {
    this.logger.debug('🔍 Checking for new jobs to simulate applications...');

    const jobs = await this.prisma.job.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
        simulationApplicationCreatedAt: null,
        status: 'OPEN',
      },
      include: {
        buyer: true,
        category: true,
      },
      take: 1,
    });

    for (const job of jobs) {
      this.logger.log(
        `🎮 SIMULASI: Membuat lamaran otomatis untuk job "${job.title}"`,
      );

      const dummySeller = await this.prisma.user.findFirst({
        where: {
          id: { not: job.buyerId },
          role: 'USER',
          emailVerified: true,
        },
      });

      if (!dummySeller) {
        this.logger.warn(`⚠️ No dummy seller found for job ${job.id}`);
        continue;
      }

      const minPrice = Math.round(job.budget * 0.8);
      const maxPrice = Math.round(job.budget * 1.2);
      const proposedPrice = Math.round(
        minPrice + Math.random() * (maxPrice - minPrice),
      );
      const proposedDuration = Math.floor(Math.random() * 14) + 3;

      const coverLetters = [
        `Halo, saya tertarik dengan pekerjaan "${job.title}". Saya memiliki pengalaman 3 tahun di bidang ini dan dapat menyelesaikan tepat waktu. Terima kasih.`,
        `Saya sangat tertarik dengan proyek "${job.title}". Portfolio saya sesuai dengan kebutuhan Anda. Saya siap mulai kapan saja.`,
        `Dengan pengalaman saya, saya yakin bisa memberikan hasil terbaik untuk "${job.title}". Mari kita diskusikan lebih lanjut.`,
        `Saya melihat proyek "${job.title}" sangat cocok dengan keahlian saya. Saya dapat menyelesaikan dalam ${proposedDuration} hari dengan kualitas terbaik.`,
      ];

      const randomCoverLetter =
        coverLetters[Math.floor(Math.random() * coverLetters.length)];

      const application = await this.prisma.application.create({
        data: {
          jobId: job.id,
          sellerId: dummySeller.id,
          coverLetter: randomCoverLetter,
          proposedPrice,
          proposedDuration,
          status: 'PENDING',
          //   simulationApplicationCreatedAt: new Date(),
        },
      });

      this.logger.log(
        `✅ Application ${application.id} created for job ${job.id}`,
      );

      await this.prisma.job.update({
        where: { id: job.id },
        data: { applicationsCount: { increment: 1 } },
      });

      // ✅ NOTIFIKASI KE BUYER (pemilik job) - Redirect ke halaman job dengan tab aplikasi
      await this.notificationsService.notify(
        job.buyerId,
        'APPLICATION',
        '📝 Ada Lamaran Baru (Simulasi)',
        `${dummySeller.name} melamar pekerjaan "${job.title}" dengan tawaran ${this.formatIDR(proposedPrice)} (${proposedDuration} hari).`,
        {
          applicationId: application.id,
          jobId: job.id,
          sellerId: dummySeller.id,
        },
        `/jobs/${job.id}?tab=applications`, // ✅ Redirect ke halaman job dengan tab aplikasi
      );

      // ✅ NOTIFIKASI KE SELLER (dummy)
      await this.notificationsService.notify(
        dummySeller.id,
        'APPLICATION',
        '✅ Lamaran Terkirim (Simulasi)',
        `Lamaran Anda untuk "${job.title}" telah terkirim. Tunggu respon dari pemilik job.`,
        { applicationId: application.id, jobId: job.id },
        `/jobs/${job.id}`,
      );
    }
  }

  // Setiap 5 detik - Simulasi penerimaan order
  @Cron('*/5 * * * * *')
  async simulateOrderAcceptance() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: ORDER_STATUS.WAITING_CONFIRMATION,
        simulationAcceptedAt: null,
      },
      take: 1,
    });

    for (const order of orders) {
      this.logger.log(
        `🎮 SIMULASI: Menerima order ${order.id} - ${order.title}`,
      );

      const updatedTimeline = await this.updateTimeline(
        order.id,
        ORDER_STATUS.ACCEPTED,
        order.sellerId,
        'Order diterima otomatis oleh sistem simulasi',
      );

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.ACCEPTED,
          simulationAcceptedAt: new Date(),
          timeline: updatedTimeline,
        },
      });

      await this.notificationsService.notify(
        order.buyerId,
        'ORDER',
        '✅ Pesanan Diterima (Simulasi)',
        `Pesanan "${order.title}" telah diterima oleh penjual. Pengerjaan akan segera dimulai.`,
        { orderId: order.id },
        `/orders/${order.id}`,
      );
    }
  }

  // Setiap 10 detik - Simulasi submit kerja
  @Cron('*/10 * * * * *')
  async simulateWorkSubmission() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: ORDER_STATUS.ACCEPTED,
        simulationWorkSubmittedAt: null,
      },
      take: 1,
    });

    for (const order of orders) {
      this.logger.log(
        `🎮 SIMULASI: Submit kerja untuk order ${order.id} - ${order.title}`,
      );

      const sampleAttachments = [
        'https://demo.tolongin.com/sample-work-v1.pdf',
        'https://demo.tolongin.com/sample-work-v2.pdf',
        'https://demo.tolongin.com/sample-work-v3.pdf',
      ];
      const randomAttachment =
        sampleAttachments[Math.floor(Math.random() * sampleAttachments.length)];

      const updatedTimeline = await this.updateTimeline(
        order.id,
        ORDER_STATUS.IN_REVIEW,
        order.sellerId,
        'Hasil kerja telah disubmit oleh sistem simulasi',
      );

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.IN_REVIEW,
          simulationWorkSubmittedAt: new Date(),
          workSubmission: JSON.stringify({
            note: '✅ [DEMO OTOMATIS] Hasil kerja telah diselesaikan. Silakan lihat lampiran. Terima kasih atas kepercayaannya.',
            attachments: [randomAttachment],
          }),
          workSubmittedAt: new Date(),
          timeline: updatedTimeline,
        },
      });

      await this.notificationsService.notify(
        order.buyerId,
        'ORDER',
        '📦 Bukti Kerja Dikirim (Simulasi)',
        `Penjual telah mengirimkan hasil kerja untuk "${order.title}". Silakan review dan approve.`,
        { orderId: order.id },
        `/orders/${order.id}`,
      );
    }
  }

  // Setiap 15 detik - Simulasi approve kerja
  @Cron('*/15 * * * * *')
  async simulateWorkApproval() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: ORDER_STATUS.IN_REVIEW,
        simulationApprovedAt: null,
      },
      take: 1,
    });

    for (const order of orders) {
      this.logger.log(
        `🎮 SIMULASI: Approve kerja untuk order ${order.id} - ${order.title}`,
      );

      const updatedTimeline = await this.updateTimeline(
        order.id,
        ORDER_STATUS.COMPLETED,
        order.buyerId,
        'Order diselesaikan otomatis oleh sistem simulasi',
      );

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.COMPLETED,
          simulationApprovedAt: new Date(),
          completedAt: new Date(),
          timeline: updatedTimeline,
        },
      });

      await this.notificationsService.notify(
        order.sellerId,
        'ORDER',
        '💰 Dana Dirilis (Simulasi)',
        `Pembeli telah menyetujui hasil kerja untuk "${order.title}". Dana sebesar ${this.formatIDR(order.amount)} telah masuk ke saldo Anda.`,
        { orderId: order.id },
        `/orders/${order.id}`,
      );
    }
  }

  // ✅ Setiap 8 detik - Simulasi penerimaan lamaran
  @Cron('*/8 * * * * *')
  async simulateApplicationAcceptance() {
    const applications = await this.prisma.application.findMany({
      where: {
        status: APPLICATION_STATUS.PENDING,
        simulationAcceptedAt: null,
      },
      include: {
        job: {
          include: {
            buyer: true,
          },
        },
        seller: true,
      },
      take: 1,
    });

    for (const app of applications) {
      this.logger.log(
        `🎮 SIMULASI: Menerima lamaran untuk ${app.job.title} dari ${app.seller.name}`,
      );

      await this.prisma.application.update({
        where: { id: app.id },
        data: {
          status: APPLICATION_STATUS.ACCEPTED,
          simulationAcceptedAt: new Date(),
          reviewedAt: new Date(),
        },
      });

      // ✅ NOTIFIKASI KE SELLER (pelamar) - Redirect ke halaman JOB (bukan orders)
      await this.notificationsService.notify(
        app.sellerId,
        'APPLICATION',
        '🎉 Lamaran Diterima (Simulasi)',
        `Lamaran Anda untuk "${app.job.title}" telah diterima! Klik untuk melihat detail pekerjaan.`,
        { applicationId: app.id, jobId: app.jobId },
        `/jobs/${app.jobId}`, // ✅ Redirect ke halaman job (bukan orders kosong)
      );

      // ✅ NOTIFIKASI KE BUYER (pemilik job) - Konfirmasi lamaran diterima
      await this.notificationsService.notify(
        app.job.buyerId,
        'APPLICATION',
        '✅ Lamaran Diterima',
        `Anda telah menerima lamaran dari ${app.seller.name} untuk pekerjaan "${app.job.title}".`,
        { applicationId: app.id, jobId: app.jobId, sellerId: app.sellerId },
        `/jobs/${app.jobId}?tab=applications`,
      );

      this.logger.log(
        `🎮 SIMULASI: Lamaran ${app.id} diterima, menunggu pembuatan order...`,
      );

      // ✅ OPSIONAL: Buat order otomatis setelah lamaran diterima
      // Ini akan membuat pengalaman lebih seamless
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          jobId: app.jobId,
          sellerId: app.sellerId,
        },
      });

      if (!existingOrder) {
        this.logger.log(
          `🎮 SIMULASI: Membuat order otomatis untuk lamaran yang diterima...`,
        );

        const fee = Math.round(app.proposedPrice * 0.05);
        const total = app.proposedPrice + fee;

        const initialTimeline = JSON.stringify([
          {
            status: 'WAITING_CONFIRMATION',
            at: new Date().toISOString(),
            by: app.job.buyerId,
            note: 'Order dibuat otomatis setelah lamaran diterima',
          },
        ]);

        const order = await this.prisma.order.create({
          data: {
            buyerId: app.job.buyerId,
            sellerId: app.sellerId,
            jobId: app.jobId,
            title: app.job.title,
            amount: app.proposedPrice,
            fee,
            totalAmount: total,
            status: 'WAITING_CONFIRMATION',
            deliveryType: 'DIGITAL',
            timeline: initialTimeline,
          },
        });

        this.logger.log(
          `✅ Order ${order.id} created for accepted application`,
        );

        // Notifikasi ke buyer tentang order yang perlu dibayar
        await this.notificationsService.notify(
          app.job.buyerId,
          'ORDER',
          '💳 Pesanan Perlu Dibayar',
          `Pesanan untuk "${app.job.title}" telah dibuat. Silakan lakukan pembayaran untuk memulai pengerjaan.`,
          { orderId: order.id, jobId: app.jobId },
          `/orders/${order.id}`,
        );

        // Notifikasi ke seller bahwa order telah dibuat
        await this.notificationsService.notify(
          app.sellerId,
          'ORDER',
          '📦 Pesanan Baru Dibuat',
          `Pesanan untuk "${app.job.title}" telah dibuat. Menunggu pembayaran dari pembeli.`,
          { orderId: order.id, jobId: app.jobId },
          `/orders/${order.id}`,
        );
      }
    }
  }
}
