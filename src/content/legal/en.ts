import type { LegalContent } from "@/lib/legal";

export const en: LegalContent = {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: August 22, 2026",
    blocks: [
      {
        type: "p",
        text: 'Chavrusa Link ("we," "us," "our") operates chavrusalink.com (the "Service"), which helps people find a study partner (chavrusa) for Torah learning. This Privacy Policy explains what information we collect, how we use it, and the choices you have.',
      },
      {
        type: "p",
        text: "By using the Service, you agree to the collection and use of information as described here.",
      },

      { type: "h2", text: "1. Information We Collect" },
      {
        type: "p",
        text: '**Account information.** When you sign up, we collect your email address and, if you use "Continue with Google," basic profile information from your Google account (name, email, profile photo).',
      },
      {
        type: "p",
        text: "**Profile information.** Name, languages spoken, topics of interest, learning level, city/neighborhood, remote/in-person preference, and general availability.",
      },
      {
        type: "p",
        text: "**Phone number.** We collect and verify your phone number via SMS code (through our provider, Twilio) before your profile becomes visible to other users. This is a safety measure to reduce fake accounts.",
      },
      {
        type: "p",
        text: "**Contact information for matching.** WhatsApp number, phone number, or Zoom link that you choose to add, shared only with a matched study partner after both of you confirm a session.",
      },
      {
        type: "p",
        text: "**Usage information.** Connect requests you send or receive, matches, scheduled sessions, and reports or blocks you submit.",
      },
      {
        type: "p",
        text: "**We do not collect:** precise GPS location (only the city/neighborhood you type in), payment information (unless/until a paid or donation feature is added, at which point this policy will be updated), or government ID numbers.",
      },

      { type: "h2", text: "2. How We Use Your Information" },
      {
        type: "ul",
        items: [
          "To create and manage your account and profile",
          "To let you browse, search, and connect with other users based on shared interests",
          "To verify your phone number and reduce fake or abusive accounts",
          "To facilitate scheduling a study session and sharing contact details once a session is confirmed",
          "To respond to reports, enforce blocks, and maintain a safe community",
          "To send you account-related emails (confirmations, password resets) via our provider, Resend",
          "To send you SMS verification codes via our provider, Twilio",
        ],
      },
      {
        type: "p",
        text: "We do not sell your personal information, and we do not use your data for advertising.",
      },

      { type: "h2", text: "3. Who Can See Your Information" },
      {
        type: "ul",
        items: [
          "Your name, languages, topics, level, city, and availability are visible to other signed-in users while browsing, **only once your phone number is verified**.",
          "Your contact information (WhatsApp/phone/Zoom) is shared **only** with a matched user, **only after** a study session is mutually confirmed.",
          "Reports you submit are visible only to Chavrusa Link administrators, not to the person you reported.",
        ],
      },

      { type: "h2", text: "4. Third-Party Services" },
      {
        type: "p",
        text: "We rely on the following providers to operate the Service. Each has its own privacy policy governing how they handle data on our behalf:",
      },
      {
        type: "ul",
        items: [
          "**Supabase** — hosts our database, handles authentication and login",
          "**Twilio** — sends SMS verification codes",
          "**Resend** — sends account-related emails",
          '**Google** — provides optional "Continue with Google" sign-in',
          "**Vercel** — hosts our website",
        ],
      },

      { type: "h2", text: "5. Data Retention" },
      {
        type: "p",
        text: "We retain your account and profile information for as long as your account is active. If you delete your account, we will delete your profile information within 30 days, except where we're required to retain records (e.g., to investigate a safety report).",
      },

      { type: "h2", text: "6. Your Choices and Rights" },
      {
        type: "ul",
        items: [
          "You can edit or delete most profile information at any time from your account settings.",
          "You can block another user, which prevents them from seeing your profile or contacting you.",
          "You can report a user for review by our team.",
          "You can request a copy of your data or request deletion of your account by contacting us (see below).",
        ],
      },
      {
        type: "p",
        text: "If you are in the EU/UK, you have additional rights under GDPR, including the right to access, correct, delete, or port your data, and to object to certain processing. If you are a California resident, you have rights under the CCPA, including the right to know what personal information is collected and to request deletion.",
      },

      { type: "h2", text: "7. Children's Privacy" },
      {
        type: "p",
        text: "The Service is not directed to children under 18, and we do not knowingly collect information from anyone under 18. If you believe a minor has created an account, please contact us so we can remove it.",
      },

      { type: "h2", text: "8. Data Security" },
      {
        type: "p",
        text: "We use industry-standard measures (including encrypted connections and access controls via our providers) to protect your information. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.",
      },

      { type: "h2", text: "9. International Users" },
      {
        type: "p",
        text: "Because Chavrusa Link supports multiple languages and may be used by people in different countries, your information may be processed in countries other than your own, including the United States, by our service providers listed above.",
      },

      { type: "h2", text: "10. Changes to This Policy" },
      {
        type: "p",
        text: 'We may update this Privacy Policy from time to time. We will post the updated version here with a new "Last updated" date. Continued use of the Service after changes means you accept the updated policy.',
      },

      { type: "h2", text: "11. Contact Us" },
      {
        type: "p",
        text: "If you have questions about this Privacy Policy or want to exercise your data rights, contact us at: **info@chavrusalink.com**",
      },
    ],
  },

  terms: {
    title: "Terms of Service",
    lastUpdated: "Last updated: August 22, 2026",
    blocks: [
      {
        type: "p",
        text: 'Welcome to Chavrusa Link. These Terms of Service ("Terms") govern your use of chavrusalink.com (the "Service"), operated by Chavrusa Link. By creating an account or using the Service, you agree to these Terms.',
      },

      { type: "h2", text: "1. What Chavrusa Link Is" },
      {
        type: "p",
        text: "Chavrusa Link is a platform that helps people find a study partner (chavrusa) for Torah learning. We provide tools to create a profile, browse other users, send connect requests, schedule sessions, and exchange contact information with a matched partner. **We do not organize, supervise, or take responsibility for any study session, meeting, or interaction between users** — those happen entirely between you and the other person, on your own terms and at your own risk.",
      },

      { type: "h2", text: "2. Eligibility" },
      {
        type: "p",
        text: "You must be at least 18 years old to use the Service. By creating an account, you confirm that you meet this requirement.",
      },

      { type: "h2", text: "3. Your Account" },
      {
        type: "ul",
        items: [
          "You are responsible for the accuracy of the information in your profile.",
          "You must verify your phone number before your profile becomes visible to other users. Providing a false or unauthorized phone number is a violation of these Terms.",
          "You are responsible for keeping your account credentials secure and for all activity under your account.",
          "You may not create an account on behalf of someone else, or create multiple accounts to evade a block or suspension.",
        ],
      },

      { type: "h2", text: "4. User Conduct" },
      { type: "p", text: "You agree not to:" },
      {
        type: "ul",
        items: [
          "Impersonate another person or misrepresent your identity, age, or affiliation",
          "Harass, threaten, or abuse other users",
          "Use the Service for any commercial solicitation, spam, or unrelated advertising",
          "Attempt to bypass phone verification, blocks, or other safety features",
          "Use the Service for any unlawful purpose",
        ],
      },
      {
        type: "p",
        text: "We may suspend or terminate your account if you violate these Terms, including based on a user report we determine to be credible.",
      },

      { type: "h2", text: "5. Meeting Other Users" },
      {
        type: "p",
        text: "Chavrusa Link connects you with other users, but **all in-person or remote meetings are solely between the users involved.** We do not conduct background checks, verify identities beyond phone number verification, or guarantee the conduct, safety, or intentions of any user. You are solely responsible for exercising your own judgment, including:",
      },
      {
        type: "ul",
        items: [
          "Meeting in a safe, public location for initial in-person sessions",
          "Verifying the identity of the person you're meeting, if that matters to you",
          "Reporting any user who behaves inappropriately, using the in-app Report feature",
        ],
      },
      {
        type: "p",
        text: "**We strongly encourage caution when meeting anyone from the internet in person, as you would with any platform that connects strangers.**",
      },

      { type: "h2", text: "6. Reporting and Blocking" },
      {
        type: "p",
        text: "You can report a user or block them from contacting you or seeing your profile. We review reports and may take action including warning, suspending, or permanently banning a user, at our discretion. We are not obligated to share the outcome of a report with the person who filed it.",
      },

      { type: "h2", text: "7. Content You Provide" },
      {
        type: "p",
        text: "You retain ownership of the information you put in your profile. By posting it, you grant us a license to display it to other users as part of operating the Service. You represent that you have the right to post whatever you include in your profile.",
      },

      { type: "h2", text: "8. Fees, Donations, and Paid Features" },
      {
        type: "p",
        text: "Chavrusa Link is currently free to use. If we introduce a paid tier or donation option in the future, those terms will be presented to you at that time, and this document will be updated accordingly.",
      },

      { type: "h2", text: "9. Termination" },
      {
        type: "p",
        text: "You may delete your account at any time. We may suspend or terminate your account, with or without notice, for violating these Terms or for any conduct we believe is harmful to the community.",
      },

      { type: "h2", text: "10. Disclaimers" },
      {
        type: "p",
        text: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY USER YOU MEET THROUGH THE SERVICE WILL BEHAVE APPROPRIATELY.',
      },

      { type: "h2", text: "11. Limitation of Liability" },
      {
        type: "p",
        text: "TO THE FULLEST EXTENT PERMITTED BY LAW, CHAVRUSA LINK AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE OR YOUR INTERACTIONS WITH OTHER USERS, INCLUDING ANY IN-PERSON OR REMOTE MEETING ARRANGED THROUGH THE SERVICE.",
      },

      { type: "h2", text: "12. Changes to These Terms" },
      {
        type: "p",
        text: 'We may update these Terms from time to time. We will post the updated version here with a new "Last updated" date. Continued use of the Service after changes means you accept the updated Terms.',
      },

      { type: "h2", text: "13. Governing Law" },
      {
        type: "p",
        text: "These Terms are governed by the laws of New York, USA, without regard to conflict of law principles.",
      },

      { type: "h2", text: "14. Contact Us" },
      {
        type: "p",
        text: "Questions about these Terms? Contact us at: **info@chavrusalink.com**",
      },
    ],
  },
};
