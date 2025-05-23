
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserAgreementPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
              User Agreement (Terms of Service)
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Last updated: May 23, 2025</p>

            <p>
              Please read these Terms of Service (&quot;Terms&quot;, &quot;Terms of
              Service&quot;) carefully before using the autonest.site website (the
              &quot;Service&quot;) operated by AutoNest (&quot;us&quot;, &quot;we&quot;, or
              &quot;our&quot;).
            </p>

            <p>
              Your access to and use of the Service is conditioned on your
              acceptance of and compliance with these Terms. These Terms apply
              to all visitors, users and others who access or use the Service.
            </p>

            <p>
              By accessing or using the Service you agree to be bound by these
              Terms. If you disagree with any part of the terms then you may
              not access the Service.
            </p>

            <h2>Accounts</h2>
            <p>
              When you create an account with us, you must provide us
              information that is accurate, complete, and current at all times.
              Failure to do so constitutes a breach of the Terms, which may
              result in immediate termination of your account on our Service.
            </p>
            <p>
              You are responsible for safeguarding the password that you use to
              access the Service and for any activities or actions under your
              password, whether your password is with our Service or a
              third-party service.
            </p>
            <p>
              You agree not to disclose your password to any third party. You
              must notify us immediately upon becoming aware of any breach of
              security or unauthorized use of your account.
            </p>

            <h2>Intellectual Property</h2>
            <p>
              The Service and its original content, features and functionality
              are and will remain the exclusive property of AutoNest and its
              licensors. The Service is protected by copyright, trademark, and
              other laws of both the and foreign countries. Our trademarks and
              trade dress may not be used in connection with any product or
              service without the prior written consent of AutoNest.
            </p>

            <h2>Links To Other Web Sites</h2>
            <p>
              Our Service may contain links to third-party web sites or
              services that are not owned or controlled by AutoNest.
            </p>
            <p>
              AutoNest has no control over, and assumes no responsibility for,
              the content, privacy policies, or practices of any third party
              web sites or services. You further acknowledge and agree that
              AutoNest shall not be responsible or liable, directly or
              indirectly, for any damage or loss caused or alleged to be caused
              by or in connection with use of or reliance on any such content,
              goods or services available on or through any such web sites or
              services.
            </p>
            <p>
              We strongly advise you to read the terms and conditions and
              privacy policies of any third-party web sites or services that
              you visit.
            </p>

            <h2>Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without
              prior notice or liability, for any reason whatsoever, including
              without limitation if you breach the Terms.
            </p>
            <p>
              Upon termination, your right to use the Service will immediately
              cease. If you wish to terminate your account, you may simply
              discontinue using the Service.
            </p>

            <h2>Limitation Of Liability</h2>
            <p>
              In no event shall AutoNest, nor its directors, employees,
              partners, agents, suppliers, or affiliates, be liable for any
              indirect, incidental, special, consequential or punitive damages,
              including without limitation, loss of profits, data, use,
              goodwill, or other intangible losses, resulting from (i) your
              access to or use of or inability to access or use the Service;
              (ii) any conduct or content of any third party on the Service;
              (iii) any content obtained from the Service; and (iv)
              unauthorized access, use or alteration of your transmissions or
              content, whether based on warranty, contract, tort (including
              negligence) or any other legal theory, whether or not we have
              been informed of the possibility of such damage, and even if a
              remedy set forth herein is found to have failed of its essential
              purpose.
            </p>

            <h2>Disclaimer</h2>
            <p>
              Your use of the Service is at your sole risk. The Service is
              provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. The Service is
              provided without warranties of any kind, whether express or
              implied, including, but not limited to, implied warranties of
              merchantability, fitness for a particular purpose,
              non-infringement or course of performance.
            </p>
            <p>
              AutoNest its subsidiaries, affiliates, and its licensors do not
              warrant that a) the Service will function uninterrupted, secure
              or available at any particular time or location; b) any errors or
              defects will be corrected; c) the Service is free of viruses or
              other harmful components; or d) the results of using the Service
              will meet your requirements.
            </p>

            <h2>Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with
              the laws of Your Jurisdiction, without regard to its conflict of
              law provisions.
            </p>
            <p>
              Our failure to enforce any right or provision of these Terms will
              not be considered a waiver of those rights. If any provision of
              these Terms is held to be invalid or unenforceable by a court,
              the remaining provisions of these Terms will remain in effect.
              These Terms constitute the entire agreement between us regarding
              our Service, and supersede and replace any prior agreements we
              might have between us regarding the Service.
            </p>

            <h2>Changes</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or
              replace these Terms at any time. If a revision is material we
              will try to provide at least 30 days notice prior to any new
              terms taking effect. What constitutes a material change will be
              determined at our sole discretion.
            </p>
            <p>
              By continuing to access or use our Service after those revisions
              become effective, you agree to be bound by the revised terms. If
              you do not agree to the new terms, please stop using the Service.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul>
              <li>By email: support@autonest.site (Placeholder)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
