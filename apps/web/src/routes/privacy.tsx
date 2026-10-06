import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, ShieldCheck, SlidersHorizontal } from "lucide-react";
import LegalPage, {
  LegalContact,
  type LegalSection,
} from "@/components/legal/legal-page";
import { AnalyticsPreferences } from "@/components/analytics-preferences";
import { legalPublisher } from "@/lib/legal";
import { seo } from "@/lib/seo/meta";

export const Route = createFileRoute("/privacy")({
  head: () =>
    seo({
      title: "Politique de confidentialité",
      text: "Comprenez quelles données Clik utilise, comment fonctionnent les connexions Google et GitHub, et comment exercer vos droits.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "Qui s’occupe de vos données ?",
    content: (
      <>
        <p>
          Cette politique concerne Clik, l’atelier de construction en briques 3D
          accessible sur <a href="https://clik.build">clik.build</a>. Elle
          décrit les données utilisées lorsque vous visitez le site, créez un
          compte, construisez ou partagez une création.
        </p>
        <p>
          Le responsable du traitement est{" "}
          <strong>{legalPublisher.name}</strong>
          {legalPublisher.country && `, établi en ${legalPublisher.country}`}.
          Pour toute question concernant vos données personnelles ou pour
          exercer vos droits, contactez-nous :
        </p>
        <LegalContact />
      </>
    ),
  },
  {
    id: "donnees",
    title: "Les informations utilisées",
    content: (
      <>
        <p>
          Les informations dépendent de la manière dont vous utilisez l’atelier.
        </p>
        <div className="legal-table-wrap">
          <table>
            <caption>Données utilisées selon votre activité</caption>
            <thead>
              <tr>
                <th scope="col">Votre activité</th>
                <th scope="col">Les données concernées</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Créer un compte</th>
                <td>
                  Nom ou pseudonyme, adresse email, statut de vérification,
                  identifiant du compte et informations de connexion. Avec une
                  inscription par email, votre mot de passe est conservé sous
                  une forme hachée.
                </td>
              </tr>
              <tr>
                <th scope="row">Construire</th>
                <td>
                  Titres, pièces et scènes 3D, dates de modification, versions
                  et références aux créations utilisées comme point de départ.
                </td>
              </tr>
              <tr>
                <th scope="row">Participer</th>
                <td>
                  Publications, descriptions, commentaires, votes,
                  participations aux défis, récompenses et personnalisation de
                  votre avatar.
                </td>
              </tr>
              <tr>
                <th scope="row">Se connecter</th>
                <td>
                  Sessions, fournisseur de connexion, jetons d’authentification
                  et informations techniques associées, telles que l’adresse IP
                  et le navigateur.
                </td>
              </tr>
              <tr>
                <th scope="row">Visiter le site</th>
                <td>
                  Informations techniques nécessaires à l’hébergement et à la
                  sécurité. Si vous acceptez la mesure d’audience, des
                  informations de navigation et de performance sont aussi
                  utilisées.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Vous pouvez essayer l’atelier sans compte. Les brouillons enregistrés
          sur cet appareil restent dans le stockage de votre navigateur tant que
          vous ne les transférez pas vers un compte.
        </p>
      </>
    ),
  },
  {
    id: "connexions",
    title: "Connexion avec Google ou GitHub",
    content: (
      <>
        <p>
          Si vous choisissez Google, Clik reçoit votre identifiant Google, votre
          nom, votre adresse email, son statut de vérification et, lorsqu’elle
          est fournie, votre photo de profil. Les autorisations demandées sont
          celles de connexion et de profil : <code>openid</code>,{" "}
          <code>email</code> et <code>profile</code>.
        </p>
        <p>
          Avec GitHub, Clik reçoit l’identifiant de votre compte, votre nom ou
          pseudonyme, votre adresse email et les informations de profil
          nécessaires à la connexion, dont votre avatar lorsqu’il est fourni.
          Les autorisations utilisées sont <code>read:user</code> et{" "}
          <code>user:email</code>.
        </p>
        <p>
          Ces informations servent à créer ou retrouver votre compte Clik et à
          établir votre session. Les identifiants et jetons nécessaires à cette
          connexion sont conservés par le service d’authentification dans
          Convex. Les données de connexion ne sont pas vendues ni utilisées pour
          de la publicité ciblée ou l’entraînement de modèles d’intelligence
          artificielle.
        </p>
        <div className="legal-callout">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>
            Clik n’accède pas à vos emails Gmail, à votre Google Drive ou à vos
            dépôts GitHub. Votre mot de passe Google ou GitHub est saisi auprès
            du fournisseur, qui ne le transmet pas à Clik.
          </p>
        </div>
        <p>
          Vous pouvez retirer l’autorisation depuis les paramètres de sécurité
          de votre compte{" "}
          <a
            href="https://myaccount.google.com/connections"
            target="_blank"
            rel="noreferrer"
          >
            Google
          </a>{" "}
          ou les{" "}
          <a
            href="https://github.com/settings/applications"
            target="_blank"
            rel="noreferrer"
          >
            applications autorisées sur GitHub
          </a>
          . Cette révocation est distincte de la suppression de votre compte
          Clik.
        </p>
      </>
    ),
  },
  {
    id: "finalites",
    title: "À quoi servent ces données ?",
    content: (
      <>
        <ul>
          <li>
            <strong>Fournir l’atelier et votre compte :</strong> vous
            authentifier, enregistrer vos constructions, synchroniser vos
            projets et permettre les publications, commentaires et défis. Ces
            traitements sont nécessaires à l’exécution du service que vous
            demandez.
          </li>
          <li>
            <strong>Protéger le service :</strong> gérer les sessions, prévenir
            les abus et diagnostiquer les incidents, sur la base de l’intérêt
            légitime à assurer la sécurité et le bon fonctionnement de Clik.
          </li>
          <li>
            <strong>Envoyer les emails de compte :</strong> vérifier votre
            adresse ou réinitialiser votre mot de passe, pour fournir et
            sécuriser votre accès.
          </li>
          <li>
            <strong>Mesurer la performance et la fréquentation :</strong>{" "}
            lorsque la mesure d’audience est activée et que vous y consentez.
            Vous pouvez retirer ce choix à tout moment.
          </li>
          <li>
            <strong>Répondre à une demande ou à une obligation légale :</strong>{" "}
            traiter l’exercice de vos droits et respecter les obligations
            applicables.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "publications",
    title: "Ce que les autres peuvent voir",
    content: (
      <>
        <p>
          Les projets enregistrés dans votre compte restent privés tant que vous
          ne les publiez pas. Une publication rend accessibles la création, son
          titre, sa description, votre nom d’auteur, les références à ses
          sources et les informations associées dans la galerie.
        </p>
        <p>
          Les commentaires, profils publics, participations publiées aux défis
          et récompenses affichées peuvent aussi être consultés par d’autres
          personnes. Des pages publiques peuvent être référencées par les
          moteurs de recherche. Votre adresse email et vos jetons de connexion
          ne sont pas affichés dans la galerie.
        </p>
        <div className="legal-callout">
          <Eye size={20} aria-hidden="true" />
          <p>
            Publier permet aussi à d’autres personnes de reprendre une création
            dans l’atelier. Dépublier retire votre publication de la galerie,
            mais ne supprime pas les copies déjà reprises, les captures d’écran
            ou les caches de tiers.
          </p>
        </div>
        <p>
          Évitez d’inscrire des informations personnelles dans les titres,
          descriptions, commentaires ou constructions que vous rendez publics.
        </p>
      </>
    ),
  },
  {
    id: "prestataires",
    title: "Les services qui nous accompagnent",
    content: (
      <>
        <p>
          Les prestataires suivants interviennent selon les fonctionnalités
          utilisées :
        </p>
        <ul>
          <li>
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noreferrer"
            >
              <strong>Cloudflare</strong>
            </a>{" "}
            : hébergement et distribution du site, sécurité des requêtes et
            informations techniques associées.
          </li>
          <li>
            <a
              href="https://www.convex.dev/legal/privacy"
              target="_blank"
              rel="noreferrer"
            >
              <strong>Convex</strong>
            </a>{" "}
            : base de données, authentification, projets, contenus et fichiers
            enregistrés en ligne.
          </li>
          <li>
            <a
              href="https://resend.com/legal/privacy-policy"
              target="_blank"
              rel="noreferrer"
            >
              <strong>Resend</strong>
            </a>{" "}
            : livraison des emails de vérification et de réinitialisation,
            adresse du destinataire, contenu du message et informations de
            livraison.
          </li>
          <li>
            <strong>Google et GitHub</strong> : identification lorsque vous
            choisissez l’un de ces modes de connexion. Leur propre politique
            s’applique à l’utilisation de votre compte chez eux.
          </li>
          <li>
            <a
              href="https://posthog.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              <strong>PostHog</strong>
            </a>{" "}
            : mesure d’audience et de performance, uniquement si elle est
            activée et si vous l’acceptez. Clik n’y transmet pas votre nom,
            votre adresse email, vos constructions ou le contenu de vos
            formulaires.
          </li>
        </ul>
        <p>
          Les informations sont communiquées pour les besoins de ces services.
          Elles peuvent aussi être transmises à une autorité lorsque la loi
          l’impose.
        </p>
        <p>
          Ces prestataires peuvent traiter des données dans différents pays, y
          compris hors de l’Espace économique européen. Les lieux d’hébergement
          et les garanties de transfert dépendent des services et régions
          configurés ; vous pouvez nous demander les informations applicables à
          votre compte.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Stockage local et mesure d’audience",
    content: (
      <>
        <p>
          Clik utilise des cookies de session et le stockage du navigateur pour
          maintenir votre connexion, mémoriser des préférences, conserver vos
          brouillons et enregistrer votre choix concernant la mesure d’audience.
          Ces éléments servent au fonctionnement du service.
        </p>
        <p>
          La mesure optionnelle avec PostHog reste désactivée tant que vous ne
          l’avez pas acceptée. Elle porte sur les pages visitées et la
          performance, avec un identifiant technique temporaire.
          L’enregistrement vidéo des sessions et la capture automatique des
          clics ou des formulaires sont désactivés.
        </p>
        <p>
          Accepter ou refuser ne change pas votre accès à Clik. Votre choix est
          conservé pendant six mois sur cet appareil ; vous pouvez le modifier
          ci-dessous ou depuis le pied de page.
        </p>
        <AnalyticsPreferences />
        <p>
          Effacer les données du site dans votre navigateur supprime aussi vos
          préférences et peut effacer les créations enregistrées uniquement sur
          cet appareil. Pensez à exporter les constructions que vous souhaitez
          conserver.
        </p>
      </>
    ),
  },
  {
    id: "conservation",
    title: "Conservation et suppression",
    content: (
      <>
        <p>
          Les informations de compte et les projets restent enregistrés pour
          vous permettre d’utiliser Clik et de retrouver vos créations. Les
          sessions et jetons suivent les délais du système d’authentification ;
          les journaux et messages de livraison suivent les durées appliquées
          par les prestataires.
        </p>
        <p>
          Vous pouvez supprimer vos projets ou dépublier vos créations depuis{" "}
          <Link to="/projects">Mes créations</Link>. La suppression du compte
          est disponible dans <Link to="/settings">les paramètres</Link> et met
          fin à votre accès à ce compte.
        </p>
        <div className="legal-callout legal-callout-peach">
          <p>
            <strong>Avant de supprimer votre compte :</strong> exportez ce que
            vous voulez garder et retirez les publications souhaitées. La
            suppression du compte ne supprime pas automatiquement tous les
            projets, publications ou commentaires associés. Pour demander leur
            effacement et celui des informations restantes, contactez-nous.
          </p>
        </div>
        <p>
          Les créations reprises par d’autres personnes et les références à
          leurs sources peuvent subsister dans leurs propres projets. Certaines
          informations peuvent être conservées si une obligation légale ou la
          défense d’un droit l’exige ; des copies de sauvegarde peuvent
          subsister jusqu’à leur renouvellement.
        </p>
      </>
    ),
  },
  {
    id: "droits",
    title: "Vos droits et vos choix",
    content: (
      <>
        <p>
          Selon les règles applicables à votre situation, vous pouvez demander
          l’accès à vos données, leur rectification, leur effacement, la
          limitation de leur utilisation, leur portabilité ou vous opposer à
          certains traitements. Vous pouvez retirer votre consentement à la
          mesure d’audience à tout moment.
        </p>
        <p>
          Vos paramètres permettent déjà de modifier votre nom et votre adresse
          email, de gérer vos sessions et de supprimer votre compte. Pour une
          autre demande, indiquez l’adresse du compte concerné et la nature de
          votre demande. Nous pouvons demander les informations nécessaires pour
          vérifier votre identité.
        </p>
        <LegalContact />
        <p>
          Une réponse est normalement apportée dans un délai d’un mois, avec une
          prolongation possible dans les cas prévus par la réglementation. Vous
          pouvez aussi adresser une réclamation à l’autorité de protection des
          données compétente, notamment à la{" "}
          <a
            href="https://www.cnil.fr/fr/adresser-une-plainte"
            target="_blank"
            rel="noreferrer"
          >
            CNIL
          </a>{" "}
          en France.
        </p>
      </>
    ),
  },
  {
    id: "securite",
    title: "Sécurité et évolutions",
    content: (
      <>
        <p>
          Les communications avec Clik utilisent HTTPS. L’accès aux projets
          privés est lié à votre compte et les secrets d’authentification sont
          traités côté serveur. Protégez vos moyens de connexion et fermez votre
          session sur les appareils partagés.
        </p>
        <p>
          Cette politique peut évoluer avec l’application. La date en tête de
          page indique la dernière mise à jour. Une modification importante
          concernant l’utilisation de vos données fera l’objet d’une information
          adaptée ; un nouveau consentement sera demandé lorsqu’il est
          nécessaire.
        </p>
      </>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalPage
      kind="privacy"
      title="Politique de"
      accent="confidentialité"
      description="Pour construire l’esprit libre. Voici les données que Clik utilise, pourquoi elles sont utiles et les choix qui vous appartiennent."
      summaries={[
        {
          title: "Une connexion, rien de plus",
          text: "Google et GitHub nous aident à vous identifier, avec votre email et votre profil.",
          section: "connexions",
          icon: ShieldCheck,
        },
        {
          title: "Vous décidez de partager",
          text: "Vos projets restent privés jusqu’à leur publication dans la galerie.",
          section: "publications",
          icon: Eye,
        },
        {
          title: "Vos choix restent les vôtres",
          text: "Gérez la mesure d’audience et retrouvez vos droits sur vos données.",
          section: "cookies",
          icon: SlidersHorizontal,
        },
      ]}
      sections={sections}
    />
  );
}
