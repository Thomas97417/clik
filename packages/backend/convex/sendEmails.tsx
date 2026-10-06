"use node";
import type { CSSProperties } from "react";
import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";
import { render, toPlainText } from "@react-email/render";
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Img,
  Link,
  Preview,
  Section,
} from "@react-email/components";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { SITE_URL } from "./env";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

const emailContent = {
  "reset-password": {
    subject: "Réinitialisez votre mot de passe — Clik",
    preview:
      "Choisissez un nouveau mot de passe pour retrouver votre atelier Clik.",
    eyebrow: "RETOUR À L’ATELIER",
    title: "Un nouveau mot de passe.",
    description:
      "Vous avez demandé à réinitialiser votre mot de passe. Choisissez-en un nouveau pour retrouver vos briques, vos idées et vos créations.",
    action: "Choisir mon mot de passe",
    reassurance: "Vos créations vous attendent, là où vous les avez laissées.",
    security:
      "Si vous n’avez pas demandé cette réinitialisation, vous pouvez ignorer cet email. Votre mot de passe reste inchangé.",
    retryPath: "/forgot-password",
  },
  "verify-email": {
    subject: "Confirmez votre adresse email — Clik",
    preview:
      "Une dernière étape pour sauvegarder vos créations et partager votre univers.",
    eyebrow: "BIENVENUE DANS L’ATELIER",
    title: "Confirmez votre email.",
    description:
      "Votre atelier est presque prêt. Confirmez votre adresse email pour sauvegarder vos créations et partager votre univers sur Clik.",
    action: "Confirmer mon email",
    reassurance: "Une dernière brique, et vos idées peuvent prendre forme.",
    security:
      "Si vous n’avez pas demandé cette vérification, vous pouvez ignorer cet email.",
    retryPath: "/verify-email",
  },
} as const;

type EmailKind = keyof typeof emailContent;

function AuthenticationEmail({ kind, url }: { kind: EmailKind; url: string }) {
  const content = emailContent[kind];
  const siteUrl = new URL("/", SITE_URL).href;

  return (
    <Html lang="fr" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{`
          @media only screen and (max-width: 480px) {
            .email-page { padding: 24px 12px !important; }
            .email-content { padding: 28px 24px !important; }
            .email-security { padding: 20px 24px !important; }
            .email-title { font-size: 28px !important; }
          }
        `}</style>
      </Head>
      <Preview>{content.preview}</Preview>
      <Body style={styles.body}>
        <Section className="email-page" style={styles.page}>
          <Container style={styles.container}>
            <Section style={styles.brand}>
              <Text style={styles.wordmark}>
                <Link href={siteUrl} style={styles.brandLink}>
                  clik<span style={{ color: "#356ae6" }}>.</span>
                </Link>
              </Text>
              <Text style={styles.tagline}>
                De petites briques. De grandes idées.
              </Text>
            </Section>

            <Section style={styles.card}>
              <Section style={styles.hero}>
                {/* SVG sources and their @2x PNG email exports live in public/emails. */}
                <Img
                  src={new URL(`/emails/${kind}.png`, siteUrl).href}
                  alt=""
                  role="presentation"
                  width="320"
                  height="180"
                  style={styles.art}
                />
              </Section>

              <Section className="email-content" style={styles.content}>
                <Text style={styles.eyebrow}>{content.eyebrow}</Text>
                <Heading as="h1" className="email-title" style={styles.title}>
                  {content.title}
                </Heading>
                <Text style={styles.description}>{content.description}</Text>

                <Button href={url} style={styles.button}>
                  {content.action}
                </Button>
                <Text style={styles.reassurance}>{content.reassurance}</Text>

                <Section style={styles.fallback}>
                  <Text style={styles.help}>
                    Le bouton ne fonctionne pas ? Copiez ce lien dans votre
                    navigateur :
                  </Text>
                  <Link href={url} style={styles.fallbackLink}>
                    {url}
                  </Link>
                </Section>
              </Section>

              <Section className="email-security" style={styles.security}>
                <Text style={styles.securityTitle}>
                  Votre compte, vos briques.
                </Text>
                <Text style={styles.securityText}>{content.security}</Text>
                <Text style={styles.expiry}>
                  Ce lien est personnel. S’il a expiré,{" "}
                  <Link
                    href={new URL(content.retryPath, siteUrl).href}
                    style={styles.retryLink}
                  >
                    demandez un nouveau lien
                  </Link>
                  .
                </Text>
              </Section>
            </Section>

            <Text style={styles.footer}>
              Clik · Votre atelier de construction 3D
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f4f7fc",
    color: "#202b40",
    fontFamily: '"Avenir Next", "Segoe UI", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  page: { padding: "36px 16px" },
  container: { width: "100%", maxWidth: "560px", margin: "0 auto" },
  brand: { padding: "0 0 24px", textAlign: "center" },
  wordmark: {
    margin: 0,
    fontSize: "36px",
    fontWeight: 800,
    lineHeight: "40px",
    letterSpacing: "-2px",
  },
  brandLink: { color: "#202b40", textDecoration: "none" },
  tagline: {
    margin: "6px 0 0",
    color: "#68758a",
    fontSize: "13px",
    lineHeight: "20px",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #dfe7f4",
    borderRadius: "22px",
  },
  hero: {
    padding: "16px 24px 8px",
    backgroundColor: "#eef4ff",
    borderRadius: "21px 21px 0 0",
  },
  art: {
    display: "block",
    margin: "0 auto",
    width: "100%",
    maxWidth: "320px",
    height: "auto",
    border: 0,
  },
  content: { padding: "32px 36px" },
  eyebrow: {
    color: "#356ae6",
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: "18px",
    letterSpacing: "1.5px",
    margin: "0 0 12px",
  },
  title: {
    color: "#202b40",
    fontSize: "32px",
    fontWeight: 800,
    lineHeight: "1.15",
    letterSpacing: "-1px",
    margin: "0 0 16px",
  },
  description: {
    color: "#52617a",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 26px",
  },
  button: {
    display: "block",
    backgroundColor: "#356ae6",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: "22px",
    padding: "16px 20px",
    textAlign: "center",
    textDecoration: "none",
  },
  reassurance: {
    color: "#68758a",
    fontSize: "13px",
    lineHeight: "20px",
    textAlign: "center",
    margin: "12px 0 0",
  },
  fallback: {
    borderTop: "1px solid #e4e9f1",
    marginTop: "26px",
    paddingTop: "20px",
    tableLayout: "fixed",
  },
  help: {
    color: "#68758a",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 8px",
  },
  fallbackLink: {
    display: "block",
    color: "#2458ce",
    fontSize: "12px",
    lineHeight: "20px",
    textDecoration: "underline",
    overflowWrap: "anywhere",
    wordBreak: "break-all",
  },
  security: {
    backgroundColor: "#f8faff",
    borderTop: "1px solid #e4e9f1",
    borderRadius: "0 0 21px 21px",
    padding: "22px 36px",
  },
  securityTitle: {
    color: "#52617a",
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: "20px",
    margin: "0 0 6px",
  },
  securityText: {
    color: "#68758a",
    fontSize: "13px",
    lineHeight: "21px",
    margin: 0,
  },
  expiry: {
    color: "#68758a",
    fontSize: "13px",
    lineHeight: "21px",
    margin: "10px 0 0",
  },
  retryLink: { color: "#2458ce", textDecoration: "underline" },
  footer: {
    color: "#68758a",
    fontSize: "12px",
    lineHeight: "20px",
    textAlign: "center",
    margin: "20px 0 0",
  },
} satisfies Record<string, CSSProperties>;

async function renderAuthenticationEmail(kind: EmailKind, url: string) {
  const html = await render(<AuthenticationEmail kind={kind} url={url} />);
  return { subject: emailContent[kind].subject, html, text: toPlainText(html) };
}

export const sendResetPasswordEmail = internalAction({
  args: {
    from: v.string(),
    to: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { from, to, url }) => {
    const email = await renderAuthenticationEmail("reset-password", url);

    await resend.sendEmail(ctx, { from, to, ...email });
  },
});

export const sendVerificationEmail = internalAction({
  args: {
    from: v.string(),
    to: v.string(),
    url: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { from, to, url }) => {
    const email = await renderAuthenticationEmail("verify-email", url);

    await resend.sendEmail(ctx, { from, to, ...email });
  },
});
