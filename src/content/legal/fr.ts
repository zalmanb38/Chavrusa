import type { LegalContent } from "@/lib/legal";

export const fr: LegalContent = {
  translationNote:
    "Cette traduction est fournie à titre indicatif. En cas de divergence, la version anglaise fait foi.",

  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : 22 août 2026",
    blocks: [
      {
        type: "p",
        text: 'Chavrusa Link (« nous », « notre ») exploite chavrusalink.com (le « Service »), qui aide les personnes à trouver un partenaire d\'étude (chavrusa) pour l\'étude de la Torah. La présente politique de confidentialité explique quelles informations nous recueillons, comment nous les utilisons et quels sont vos choix.',
      },
      {
        type: "p",
        text: "En utilisant le Service, vous acceptez la collecte et l'utilisation des informations telles que décrites ici.",
      },

      { type: "h2", text: "1. Informations que nous recueillons" },
      {
        type: "p",
        text: '**Informations de compte.** Lors de votre inscription, nous recueillons votre adresse e-mail et, si vous utilisez « Continuer avec Google », les informations de base de votre compte Google (nom, e-mail, photo de profil).',
      },
      {
        type: "p",
        text: "**Informations de profil.** Nom, langues parlées, sujets d'intérêt, niveau d'étude, ville ou quartier, préférence à distance ou en personne, et disponibilité générale.",
      },
      {
        type: "p",
        text: "**Numéro de téléphone.** Nous recueillons et vérifions votre numéro de téléphone par code SMS (via notre prestataire, Twilio) avant que votre profil ne devienne visible par les autres utilisateurs. Il s'agit d'une mesure de sécurité destinée à limiter les faux comptes.",
      },
      {
        type: "p",
        text: "**Coordonnées pour la mise en relation.** Numéro WhatsApp, numéro de téléphone ou lien Zoom que vous choisissez d'ajouter, partagés uniquement avec un partenaire d'étude mis en relation avec vous, après que vous avez tous deux confirmé une séance.",
      },
      {
        type: "p",
        text: "**Informations d'utilisation.** Demandes de connexion envoyées ou reçues, mises en relation, séances planifiées, ainsi que les signalements ou blocages que vous effectuez.",
      },
      {
        type: "p",
        text: "**Nous ne recueillons pas :** de position GPS précise (uniquement la ville ou le quartier que vous saisissez), d'informations de paiement (sauf si et jusqu'à ce qu'une fonctionnalité payante ou de don soit ajoutée, auquel cas la présente politique sera mise à jour), ni de numéros de pièce d'identité.",
      },

      { type: "h2", text: "2. Comment nous utilisons vos informations" },
      {
        type: "ul",
        items: [
          "Pour créer et gérer votre compte et votre profil",
          "Pour vous permettre de parcourir, rechercher et entrer en relation avec d'autres utilisateurs selon vos intérêts communs",
          "Pour vérifier votre numéro de téléphone et limiter les comptes frauduleux ou abusifs",
          "Pour faciliter la planification d'une séance d'étude et le partage des coordonnées une fois la séance confirmée",
          "Pour répondre aux signalements, appliquer les blocages et préserver la sécurité de la communauté",
          "Pour vous envoyer les e-mails liés au compte (confirmations, réinitialisations de mot de passe) via notre prestataire, Resend",
          "Pour vous envoyer les codes de vérification par SMS via notre prestataire, Twilio",
        ],
      },
      {
        type: "p",
        text: "Nous ne vendons pas vos données personnelles et nous ne les utilisons pas à des fins publicitaires.",
      },

      { type: "h2", text: "3. Qui peut voir vos informations" },
      {
        type: "ul",
        items: [
          "Votre nom, vos langues, vos sujets, votre niveau, votre ville et votre disponibilité sont visibles par les autres utilisateurs connectés lorsqu'ils parcourent le site, **uniquement une fois votre numéro de téléphone vérifié**.",
          "Vos coordonnées (WhatsApp / téléphone / Zoom) sont partagées **uniquement** avec un utilisateur mis en relation avec vous, et **seulement après** qu'une séance d'étude a été confirmée par vous deux.",
          "Les signalements que vous soumettez ne sont visibles que par les administrateurs de Chavrusa Link, et jamais par la personne signalée.",
        ],
      },

      { type: "h2", text: "4. Services tiers" },
      {
        type: "p",
        text: "Nous faisons appel aux prestataires suivants pour exploiter le Service. Chacun dispose de sa propre politique de confidentialité régissant le traitement des données pour notre compte :",
      },
      {
        type: "ul",
        items: [
          "**Supabase** — héberge notre base de données, gère l'authentification et la connexion",
          "**Twilio** — envoie les codes de vérification par SMS",
          "**Resend** — envoie les e-mails liés au compte",
          '**Google** — fournit la connexion facultative « Continuer avec Google »',
          "**Vercel** — héberge notre site web",
        ],
      },

      { type: "h2", text: "5. Conservation des données" },
      {
        type: "p",
        text: "Nous conservons les informations de votre compte et de votre profil tant que votre compte est actif. Si vous supprimez votre compte, nous supprimerons les informations de votre profil sous 30 jours, sauf lorsque nous sommes tenus de conserver certains éléments (par exemple pour instruire un signalement de sécurité).",
      },

      { type: "h2", text: "6. Vos choix et vos droits" },
      {
        type: "ul",
        items: [
          "Vous pouvez modifier ou supprimer la plupart des informations de votre profil à tout moment depuis les paramètres de votre compte.",
          "Vous pouvez bloquer un autre utilisateur, ce qui l'empêche de voir votre profil ou de vous contacter.",
          "Vous pouvez signaler un utilisateur afin que notre équipe l'examine.",
          "Vous pouvez demander une copie de vos données ou la suppression de votre compte en nous contactant (voir ci-dessous).",
        ],
      },
      {
        type: "p",
        text: "Si vous résidez dans l'UE ou au Royaume-Uni, vous disposez de droits supplémentaires au titre du RGPD, notamment le droit d'accéder à vos données, de les rectifier, de les effacer ou de les porter, ainsi que de vous opposer à certains traitements. Si vous résidez en Californie, vous disposez de droits au titre du CCPA, notamment celui de savoir quelles données personnelles sont collectées et d'en demander la suppression.",
      },

      { type: "h2", text: "7. Protection des mineurs" },
      {
        type: "p",
        text: "Le Service n'est pas destiné aux personnes de moins de 18 ans et nous ne recueillons pas sciemment d'informations auprès de personnes de moins de 18 ans. Si vous pensez qu'un mineur a créé un compte, veuillez nous contacter afin que nous puissions le supprimer.",
      },

      { type: "h2", text: "8. Sécurité des données" },
      {
        type: "p",
        text: "Nous appliquons des mesures conformes aux normes du secteur (notamment des connexions chiffrées et des contrôles d'accès via nos prestataires) pour protéger vos informations. Aucune méthode de transmission ou de stockage n'est sûre à 100 %, et nous ne pouvons garantir une sécurité absolue.",
      },

      { type: "h2", text: "9. Utilisateurs internationaux" },
      {
        type: "p",
        text: "Comme Chavrusa Link est proposé en plusieurs langues et peut être utilisé depuis différents pays, vos informations peuvent être traitées dans des pays autres que le vôtre, y compris aux États-Unis, par les prestataires listés ci-dessus.",
      },

      { type: "h2", text: "10. Modifications de cette politique" },
      {
        type: "p",
        text: 'Nous pouvons mettre à jour la présente politique de confidentialité de temps à autre. Nous publierons ici la version mise à jour, avec une nouvelle date de « Dernière mise à jour ». Poursuivre l\'utilisation du Service après une modification vaut acceptation de la politique mise à jour.',
      },

      { type: "h2", text: "11. Nous contacter" },
      {
        type: "p",
        text: "Pour toute question sur cette politique de confidentialité ou pour exercer vos droits, contactez-nous à : **info@chavrusalink.com**",
      },
    ],
  },

  terms: {
    title: "Conditions d'utilisation",
    lastUpdated: "Dernière mise à jour : 22 août 2026",
    blocks: [
      {
        type: "p",
        text: 'Bienvenue sur Chavrusa Link. Les présentes conditions d\'utilisation (les « Conditions ») régissent votre utilisation de chavrusalink.com (le « Service »), exploité par Chavrusa Link. En créant un compte ou en utilisant le Service, vous acceptez ces Conditions.',
      },

      { type: "h2", text: "1. Ce qu'est Chavrusa Link" },
      {
        type: "p",
        text: "Chavrusa Link est une plateforme qui aide les personnes à trouver un partenaire d'étude (chavrusa) pour l'étude de la Torah. Nous fournissons des outils permettant de créer un profil, de parcourir les autres utilisateurs, d'envoyer des demandes de connexion, de planifier des séances et d'échanger des coordonnées avec un partenaire. **Nous n'organisons, ne supervisons et n'assumons aucune responsabilité concernant les séances d'étude, rencontres ou interactions entre utilisateurs** — celles-ci se déroulent entièrement entre vous et l'autre personne, selon vos propres modalités et à vos propres risques.",
      },

      { type: "h2", text: "2. Conditions d'admissibilité" },
      {
        type: "p",
        text: "Vous devez avoir au moins 18 ans pour utiliser le Service. En créant un compte, vous confirmez remplir cette condition.",
      },

      { type: "h2", text: "3. Votre compte" },
      {
        type: "ul",
        items: [
          "Vous êtes responsable de l'exactitude des informations figurant dans votre profil.",
          "Vous devez vérifier votre numéro de téléphone avant que votre profil ne devienne visible par les autres utilisateurs. Fournir un numéro faux ou dont vous n'êtes pas titulaire constitue une violation des présentes Conditions.",
          "Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis votre compte.",
          "Vous ne pouvez pas créer de compte au nom d'une autre personne, ni créer plusieurs comptes pour contourner un blocage ou une suspension.",
        ],
      },

      { type: "h2", text: "4. Règles de conduite" },
      { type: "p", text: "Vous vous engagez à ne pas :" },
      {
        type: "ul",
        items: [
          "Usurper l'identité d'une autre personne ou donner une fausse représentation de votre identité, de votre âge ou de vos affiliations",
          "Harceler, menacer ou maltraiter d'autres utilisateurs",
          "Utiliser le Service à des fins de sollicitation commerciale, de spam ou de publicité sans rapport",
          "Tenter de contourner la vérification téléphonique, les blocages ou d'autres dispositifs de sécurité",
          "Utiliser le Service à des fins illicites",
        ],
      },
      {
        type: "p",
        text: "Nous pouvons suspendre ou résilier votre compte en cas de violation des présentes Conditions, y compris sur la base d'un signalement d'utilisateur que nous jugeons crédible.",
      },

      { type: "h2", text: "5. Rencontrer d'autres utilisateurs" },
      {
        type: "p",
        text: "Chavrusa Link vous met en relation avec d'autres utilisateurs, mais **toutes les rencontres, en personne ou à distance, relèvent exclusivement des utilisateurs concernés.** Nous n'effectuons pas de vérification d'antécédents, ne vérifions pas les identités au-delà du numéro de téléphone, et ne garantissons ni le comportement, ni la sécurité, ni les intentions d'un utilisateur. Il vous appartient seul de faire preuve de discernement, notamment :",
      },
      {
        type: "ul",
        items: [
          "En vous rencontrant dans un lieu public et sûr lors des premières séances en personne",
          "En vérifiant l'identité de la personne que vous rencontrez, si cela vous importe",
          "En signalant tout utilisateur au comportement inapproprié, via la fonction de signalement du site",
        ],
      },
      {
        type: "p",
        text: "**Nous vous encourageons vivement à la prudence lorsque vous rencontrez en personne quelqu'un connu sur internet, comme vous le feriez sur toute plateforme mettant en relation des inconnus.**",
      },

      { type: "h2", text: "6. Signalement et blocage" },
      {
        type: "p",
        text: "Vous pouvez signaler un utilisateur ou l'empêcher de vous contacter et de voir votre profil. Nous examinons les signalements et pouvons prendre des mesures telles qu'un avertissement, une suspension ou un bannissement définitif, à notre discrétion. Nous ne sommes pas tenus de communiquer l'issue d'un signalement à la personne qui l'a soumis.",
      },

      { type: "h2", text: "7. Contenu que vous fournissez" },
      {
        type: "p",
        text: "Vous conservez la propriété des informations que vous publiez dans votre profil. En les publiant, vous nous accordez une licence pour les afficher aux autres utilisateurs dans le cadre de l'exploitation du Service. Vous déclarez disposer du droit de publier tout ce que contient votre profil.",
      },

      { type: "h2", text: "8. Frais, dons et fonctionnalités payantes" },
      {
        type: "p",
        text: "Chavrusa Link est actuellement gratuit. Si nous introduisons une offre payante ou une option de don à l'avenir, les conditions correspondantes vous seront présentées à ce moment-là et le présent document sera mis à jour en conséquence.",
      },

      { type: "h2", text: "9. Résiliation" },
      {
        type: "p",
        text: "Vous pouvez supprimer votre compte à tout moment. Nous pouvons suspendre ou résilier votre compte, avec ou sans préavis, en cas de violation des présentes Conditions ou de tout comportement que nous estimons nuisible à la communauté.",
      },

      { type: "h2", text: "10. Exclusions de garantie" },
      {
        type: "p",
        text: "LE SERVICE EST FOURNI « EN L'ÉTAT », SANS GARANTIE D'AUCUNE SORTE, EXPRESSE OU IMPLICITE. NOUS NE GARANTISSONS PAS QUE LE SERVICE SERA ININTERROMPU, EXEMPT D'ERREURS OU SÉCURISÉ, NI QU'UN UTILISATEUR RENCONTRÉ VIA LE SERVICE SE COMPORTERA DE MANIÈRE APPROPRIÉE.",
      },

      { type: "h2", text: "11. Limitation de responsabilité" },
      {
        type: "p",
        text: "DANS TOUTE LA MESURE PERMISE PAR LA LOI, CHAVRUSA LINK ET SES EXPLOITANTS NE SAURAIENT ÊTRE TENUS RESPONSABLES DE TOUT DOMMAGE INDIRECT, ACCESSOIRE, SPÉCIAL OU CONSÉCUTIF DÉCOULANT DE VOTRE UTILISATION DU SERVICE OU DE VOS INTERACTIONS AVEC D'AUTRES UTILISATEURS, Y COMPRIS TOUTE RENCONTRE EN PERSONNE OU À DISTANCE ORGANISÉE VIA LE SERVICE.",
      },

      { type: "h2", text: "12. Modifications des présentes Conditions" },
      {
        type: "p",
        text: 'Nous pouvons modifier les présentes Conditions de temps à autre. Nous publierons ici la version mise à jour, avec une nouvelle date de « Dernière mise à jour ». Poursuivre l\'utilisation du Service après une modification vaut acceptation des Conditions mises à jour.',
      },

      { type: "h2", text: "13. Droit applicable" },
      {
        type: "p",
        text: "Les présentes Conditions sont régies par le droit de l'État de New York, États-Unis, sans égard aux règles de conflit de lois.",
      },

      { type: "h2", text: "14. Nous contacter" },
      {
        type: "p",
        text: "Des questions sur ces Conditions ? Contactez-nous à : **info@chavrusalink.com**",
      },
    ],
  },
};
