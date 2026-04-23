import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../prisma/prisma.service";

type SendEmailInput = {
  to: string;
  subject: string;
  preheader: string;
  body: string;
  actionLabel?: string;
  actionPath?: string;
};

type SendNotificationInput = {
  userId: string;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: string;
  actionPath?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: string;
  private readonly from: string;
  private readonly appPublicUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    this.provider = this.configService.get<string>("EMAIL_PROVIDER") ?? "log";
    this.from =
      this.configService.get<string>("EMAIL_FROM") ??
      "LibreMercado <no-reply@libremercado.local>";
    this.appPublicUrl =
      this.configService.get<string>("APP_PUBLIC_URL") ?? "http://localhost:3000";
  }

  async sendWelcomeEmail(userId: string) {
    await this.runBestEffort(() =>
      this.sendToUser(userId, {
        subject: "Bienvenido a LibreMercado",
        preheader:
          "Tu cuenta ya fue creada y tu identidad quedó pendiente de revisión.",
        body:
          "Ya podés explorar el marketplace. Para operar con compra protegida, nuestro equipo revisará tu DNI y selfie.",
        actionLabel: "Ver mi cuenta",
        actionPath: "/account"
      })
    );
  }

  async sendPasswordResetEmail(userId: string, token: string) {
    await this.runBestEffort(() =>
      this.sendToUser(userId, {
        subject: "Restablecé tu contraseña de LibreMercado",
        preheader: "Usá este enlace para crear una contraseña nueva.",
        body:
          "Recibimos una solicitud para restablecer tu contraseña. El enlace vence pronto y solo puede usarse una vez. Si no fuiste vos, podés ignorar este mensaje.",
        actionLabel: "Crear nueva contraseña",
        actionPath: `/reset-password?token=${encodeURIComponent(token)}`
      })
    );
  }

  async sendNotificationEmail(input: SendNotificationInput) {
    await this.runBestEffort(() =>
      this.sendToUser(input.userId, {
        subject: input.title,
        preheader: input.body,
        body: input.body,
        actionLabel: "Ver detalle",
        actionPath: input.actionPath ?? this.getActionPath(input.resourceType)
      })
    );
  }

  async sendBulkNotificationEmails(inputs: SendNotificationInput[]) {
    await Promise.all(inputs.map((input) => this.sendNotificationEmail(input)));
  }

  private async sendToUser(userId: string, input: Omit<SendEmailInput, "to">) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true
      }
    });

    if (!user) {
      return;
    }

    await this.send({
      ...input,
      to: user.email,
      body: `Hola ${user.firstName},\n\n${input.body}`
    });
  }

  private async send(input: SendEmailInput) {
    if (this.provider === "disabled") {
      return;
    }

    if (this.provider !== "log") {
      this.logger.warn(
        `EMAIL_PROVIDER=${this.provider} todavía no está implementado. Se registra el email localmente.`
      );
    }

    this.logger.log(
      [
        "Email transaccional",
        `From: ${this.from}`,
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        `Preheader: ${input.preheader}`,
        `Action: ${input.actionLabel ?? "Sin acción"} ${
          input.actionPath ? this.toAbsoluteUrl(input.actionPath) : ""
        }`,
        input.body
      ].join("\n")
    );
  }

  private getActionPath(resourceType?: string) {
    if (resourceType === "kyc_verification") {
      return "/account/kyc";
    }

    return "/account";
  }

  private toAbsoluteUrl(path: string) {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    return `${this.appPublicUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }

  private async runBestEffort(operation: () => Promise<void>) {
    try {
      await operation();
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? `No se pudo emitir email transaccional: ${error.message}`
          : "No se pudo emitir email transaccional."
      );
    }
  }
}
