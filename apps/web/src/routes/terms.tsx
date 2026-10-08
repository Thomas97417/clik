import { createFileRoute, Link } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import LegalPage, {
  LegalContact,
  type LegalSection,
} from "@/components/legal/legal-page";
import { legalPublisher } from "@/lib/legal";
import { seo } from "@/lib/seo/meta";

export const Route = createFileRoute("/terms")({
  head: () =>
    seo({
      title: "Conditions d’utilisation",
      text: "Les règles de l’atelier Clik : accès au compte, droits sur vos créations, partage dans la galerie et respect de la communauté.",
      path: "/terms",
    }),
  component: TermsPage,
});

const sections: LegalSection[] = [
  {
    id: "service",
    title: "Bienvenue dans l’atelier",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Clik est un atelier en ligne pour créer des constructions en briques
          3D, enregistrer ses idées, découvrir une galerie, reprendre des
          créations et participer à des défis. Le service est accessible sur{" "}
          <a
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 text-[#2e61cf] underline underline-offset-3 decoration-current wrap-anywhere hover:decoration-[#356ae6] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px]"
            href="https://clik.build"
          >
            clik.build
          </a>{" "}
          et est édité par{" "}
          <strong className="font-[650] text-[#384a64]">
            {legalPublisher.name}
          </strong>
          {legalPublisher.country && `, établi en ${legalPublisher.country}`}.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Ces conditions définissent les règles d’utilisation de l’application
          et de ses espaces de partage. L’utilisation du service implique de
          respecter ces règles. Les fonctionnalités actuellement proposées sont
          accessibles gratuitement.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Pour toute question concernant ces conditions ou pour signaler un
          problème :
        </p>
        <LegalContact className="text-[#2e61cf] underline-offset-3 decoration-current wrap-anywhere hover:decoration-[#356ae6] mx-0 mt-0 mb-3.75 no-underline" />
      </>
    ),
  },
  {
    id: "acces",
    title: "Accès et compte",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Vous pouvez essayer l’atelier sans compte et enregistrer des
          brouillons sur votre appareil. Un compte est nécessaire pour
          enregistrer vos projets en ligne, publier, commenter et utiliser les
          fonctionnalités liées à votre profil.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Lors de l’inscription, fournissez une adresse email que vous contrôlez
          et des informations exactes. Vous pouvez choisir un pseudonyme. La
          connexion par Google ou GitHub reste soumise aux règles du fournisseur
          concerné.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Vous êtes responsable de la protection de vos moyens de connexion et
          de l’usage de votre compte. Informez-nous si vous constatez un accès
          non autorisé. Si vous êtes mineur, faites-vous accompagner par votre
          représentant légal lorsque la réglementation l’exige.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Un navigateur compatible avec le rendu 3D est nécessaire. L’expérience
          de construction est conçue pour un ordinateur ; certaines
          fonctionnalités peuvent être limitées selon l’appareil ou le
          navigateur.
        </p>
      </>
    ),
  },
  {
    id: "creations",
    title: "Vos créations et vos droits",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Vous conservez les droits que vous détenez sur vos constructions et
          les contenus que vous fournissez. Assurez-vous de disposer des droits
          nécessaires sur les éléments que vous utilisez et partagez.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          En enregistrant ou publiant un contenu, vous autorisez Clik à
          l’héberger, à effectuer les copies techniques nécessaires et à
          l’afficher selon la visibilité choisie. Cette autorisation sert au
          fonctionnement de l’atelier et de la galerie.
        </p>
        <div className="legal-callout px-5 py-4.5 mx-0 my-5.5 gap-3 border border-solid border-[#dce7f8] flex items-start rounded-[12px] bg-[#edf3fd] text-[#4f678a] max-md-compact:p-3.75 max-md-compact:gap-2.5 print:[&&]:break-inside-avoid last:mb-0">
          <Palette
            className="shrink-0 mt-0.75 text-[#668dcb]"
            size={20}
            aria-hidden="true"
          />
          <p className="m-0 text-[13px] leading-[1.85] max-md-compact:text-xs">
            En publiant une création, vous permettez aux autres utilisateurs de
            la consulter et de la reprendre dans l’atelier, notamment pour la
            modifier ou l’intégrer à une nouvelle construction, avec les
            références à son origine prévues par Clik.
          </p>
        </div>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Respectez les droits des auteurs lorsque vous reprenez une création.
          La possibilité de la copier dans l’atelier ne constitue pas une
          autorisation générale d’exploitation commerciale hors de Clik.
        </p>
      </>
    ),
  },
  {
    id: "partage",
    title: "Publication et reprises",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          La publication est une action volontaire. Elle rend publics votre
          construction, son titre, sa description, le nom d’auteur et les
          informations associées. Les publications et profils publics peuvent
          être consultés sans compte et référencés par des moteurs de recherche.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Vous pouvez retirer une publication depuis{" "}
          <Link
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 text-[#2e61cf] underline underline-offset-3 decoration-current wrap-anywhere hover:decoration-[#356ae6] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px]"
            to="/projects"
          >
            Mes créations
          </Link>
          . Ce retrait empêche sa consultation dans la galerie, mais ne retire
          pas les copies déjà reprises par d’autres utilisateurs ou conservées
          par des tiers.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Les liens entre une construction et ses sources font partie du
          fonctionnement de Clik. Une reprise publiée peut donc conserver des
          références à la création dont elle est issue.
        </p>
      </>
    ),
  },
  {
    id: "communaute",
    title: "Un espace agréable pour chacun",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Dans vos publications, descriptions et commentaires, respectez les
          autres personnes et les règles applicables. En particulier :
        </p>
        <ul className="last:mb-0 mx-0 pl-5 mt-0 mb-4.25 list-disc">
          <li className="pl-1 mb-3 marker:text-[#86a6db]">
            Partagez uniquement des contenus que vous avez le droit d’utiliser.
          </li>
          <li className="pl-1 mb-3 marker:text-[#86a6db]">
            Évitez le harcèlement, les menaces, les propos discriminatoires et
            les contenus illicites.
          </li>
          <li className="pl-1 mb-3 marker:text-[#86a6db]">
            Ne divulguez pas les informations personnelles d’autrui sans
            autorisation.
          </li>
          <li className="pl-1 mb-3 marker:text-[#86a6db]">
            N’utilisez pas Clik pour diffuser du spam, des liens trompeurs ou du
            contenu malveillant.
          </li>
          <li className="pl-1 mb-3 marker:text-[#86a6db]">
            Ne contournez pas les protections du service et ne tentez pas
            d’accéder aux comptes ou projets privés d’autres personnes.
          </li>
          <li className="pl-1 mb-3 marker:text-[#86a6db]">
            Participez aux défis et aux votes sans manipulation ni
            automatisation abusive.
          </li>
        </ul>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Si vous souhaitez signaler un contenu, contactez-nous avec le lien de
          la publication concernée et les raisons de votre signalement. Un
          contenu contraire à ces règles peut être retiré et l’accès d’un compte
          peut être restreint ou suspendu, selon la situation.
        </p>
      </>
    ),
  },
  {
    id: "sauvegardes",
    title: "Enregistrement et disponibilité",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Les créations sans compte sont enregistrées dans votre navigateur.
          Elles peuvent être perdues si vous effacez les données du site,
          changez d’appareil ou utilisez une session privée. Les projets
          associés à un compte sont enregistrés en ligne lorsque la
          synchronisation aboutit.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Une coupure de réseau, un incident ou une opération de maintenance
          peut interrompre l’accès ou retarder l’enregistrement.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Clik évolue régulièrement. Certaines fonctionnalités peuvent être
          modifiées, interrompues ou retirées. Le service est fourni avec les
          limites techniques d’une application en ligne ; ces conditions ne
          limitent pas les droits et garanties que la loi vous accorde.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Les contenus publiés par les utilisateurs restent sous leur
          responsabilité. Si un contenu pose problème, signalez-le pour
          permettre son examen.
        </p>
      </>
    ),
  },
  {
    id: "donnees-personnelles",
    title: "Vos données personnelles",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          La{" "}
          <Link
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 text-[#2e61cf] underline underline-offset-3 decoration-current wrap-anywhere hover:decoration-[#356ae6] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px]"
            to="/privacy"
          >
            politique de confidentialité
          </Link>{" "}
          explique les données utilisées par Clik, la connexion avec Google ou
          GitHub, les prestataires techniques, le stockage local et vos droits.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Clik mesure automatiquement la fréquentation et les performances de
          l’application. Cette mesure fonctionne sans écran d’acceptation, sans
          cookies d’analyse persistants ni enregistrement des sessions. Son
          fonctionnement et vos droits sont décrits dans la politique de
          confidentialité.
        </p>
      </>
    ),
  },
  {
    id: "quitter",
    title: "Quitter Clik",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Vous pouvez cesser d’utiliser Clik à tout moment. Vous pouvez aussi
          supprimer votre compte depuis{" "}
          <Link
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 text-[#2e61cf] underline underline-offset-3 decoration-current wrap-anywhere hover:decoration-[#356ae6] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#a7c0f2] focus-visible:outline-offset-4 focus-visible:rounded-[5px]"
            to="/settings"
          >
            les paramètres
          </Link>
          .
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Avant cette suppression, supprimez ou dépubliez les contenus que vous
          souhaitez retirer. La suppression du compte ferme votre accès ; elle
          ne supprime pas automatiquement tous les projets, publications et
          commentaires associés. Contactez-nous pour demander l’effacement des
          données restantes.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Les reprises déjà réalisées par d’autres utilisateurs et leurs
          références aux sources peuvent subsister, comme expliqué dans la
          politique de confidentialité.
        </p>
      </>
    ),
  },
  {
    id: "evolutions",
    title: "Évolution de ces conditions",
    content: (
      <>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          Ces conditions peuvent être mises à jour pour tenir compte de
          l’évolution de Clik ou des règles applicables. La date indiquée en
          tête de page identifie la version publiée. Les modifications
          importantes seront portées à votre connaissance de manière adaptée.
        </p>
        <p className="mx-0 mt-0 mb-3.75 last:mb-0">
          En cas de difficulté, contactez-nous en premier lieu pour chercher une
          solution. Les règles impératives applicables à votre situation et vos
          voies de recours restent pleinement applicables.
        </p>
        <LegalContact className="text-[#2e61cf] underline-offset-3 decoration-current wrap-anywhere hover:decoration-[#356ae6] mx-0 mt-0 mb-3.75 no-underline" />
      </>
    ),
  },
];

function TermsPage() {
  return (
    <LegalPage
      kind="terms"
      title="Conditions"
      accent="d’utilisation"
      description="De bonnes bases pour de grandes idées. Quelques règles pour créer, partager et prendre soin de l’atelier ensemble."
      sections={sections}
    />
  );
}
