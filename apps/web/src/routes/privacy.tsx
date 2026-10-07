import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, ShieldCheck } from "lucide-react";
import LegalPage, {
  LegalContact,
  type LegalSection,
} from "@/components/legal/legal-page";
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
                  sécurité, pages consultées, type de navigateur et d’appareil,
                  ainsi que mesures de performance du site.
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
          Si vous choisissez Google ou GitHub, Clik reçoit les informations de
          profil nécessaires à votre compte : identifiant, nom ou pseudonyme,
          adresse email et, lorsqu’elle est disponible, photo de profil.
        </p>
        <p>
          Ces informations servent à créer ou retrouver votre compte et à vous
          connecter. Elles ne sont ni vendues ni utilisées pour de la publicité
          ciblée ou l’entraînement de modèles d’intelligence artificielle.
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
            comprendre l’utilisation de Clik et améliorer sa fiabilité. Cette
            mesure est activée automatiquement et poursuit l’intérêt légitime de
            l’éditeur à améliorer le service.
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
    title: "Avec qui les données sont-elles partagées ?",
    content: (
      <>
        <p>
          Clik fait appel à des prestataires pour héberger le site, enregistrer
          les comptes et les projets, envoyer les emails de compte et mesurer
          l’audience. Ils reçoivent les informations utiles à ces fonctions.
        </p>
        <p>
          Des informations peuvent aussi être transmises à une autorité lorsque
          la loi l’impose.
        </p>
        <p>
          Certains services peuvent traiter des données hors de l’Espace
          économique européen. Contactez-nous pour connaître les destinations et
          les garanties applicables à votre compte.
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
          brouillons. Ces éléments servent au fonctionnement du service.
        </p>
        <p>
          Clik utilise PostHog pour mesurer automatiquement la fréquentation et
          la performance dès votre visite. Aucun écran d’acceptation n’est
          affiché. La configuration de cette mesure n’utilise pas de cookies ni
          d’identifiants persistants dans le stockage de votre navigateur.
        </p>
        <p>
          Cette mesure concerne les pages consultées et des informations
          techniques sur le navigateur, l’appareil et les temps de chargement.
          Elle n’enregistre pas vos sessions, le contenu de vos créations ou vos
          formulaires, et n’est pas reliée à votre compte Clik. Les identifiants
          de créations et de comptes sont retirés des chemins transmis.
        </p>
        <p>
          Effacer les données du site dans votre navigateur supprime aussi vos
          préférences et peut effacer les créations enregistrées uniquement sur
          cet appareil.
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
          Les informations de compte et les projets sont conservés pour assurer
          votre accès à Clik et vous permettre de retrouver vos créations.
        </p>
        <p>
          Vous pouvez supprimer vos projets ou dépublier vos créations depuis{" "}
          <Link to="/projects">Mes créations</Link>. La suppression du compte
          est disponible dans <Link to="/settings">les paramètres</Link> et met
          fin à votre accès à ce compte.
        </p>
        <div className="legal-callout legal-callout-peach">
          <p>
            <strong>Avant de supprimer votre compte :</strong> supprimez ou
            dépubliez les créations que vous souhaitez retirer. La suppression
            du compte ne supprime pas automatiquement tous les projets,
            publications ou commentaires associés. Pour demander leur effacement
            et celui des informations restantes, contactez-nous.
          </p>
        </div>
        <p>
          Les mesures de fréquentation et de performance sont conservées dans le
          service d’analyse selon les réglages de conservation du projet.
          Contactez-nous pour obtenir des précisions sur ces durées.
        </p>
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
          certains traitements, notamment la mesure d’audience. Pour exercer ces
          droits ou poser une question, contactez-nous à l’adresse ci-dessous.
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
          L’accès à vos projets privés est protégé par votre compte. Protégez
          vos moyens de connexion et fermez votre session sur les appareils
          partagés.
        </p>
        <p>
          Cette politique peut évoluer avec l’application. La date en tête de
          page indique la dernière mise à jour. Une modification importante
          concernant l’utilisation de vos données fera l’objet d’une information
          adaptée.
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
      description="Pour construire l’esprit libre. Voici les données que Clik utilise, pourquoi elles sont utiles et comment exercer vos droits."
      sections={sections}
    />
  );
}
