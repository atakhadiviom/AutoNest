
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Last updated: May 23, 2025</p>

            <p>
              Welcome to AutoNest (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;). We operate the
              autonest.site website (hereinafter referred to as the
              &quot;Service&quot;).
            </p>

            <p>
              This page informs you of our policies regarding the collection,
              use, and disclosure of personal data when you use our Service and
              the choices you have associated with that data. Our Privacy Policy
              for AutoNest is managed with the help of the Privacy Policy
              Generator.
            </p>

            <p>
              We use your data to provide and improve the Service. By using the
              Service, you agree to the collection and use of information in
              accordance with this policy. Unless otherwise defined in this
              Privacy Policy, terms used in this Privacy Policy have the same
              meanings as in our Terms and Conditions, accessible from
              autonest.site
            </p>

            <h2>Information Collection And Use</h2>
            <p>
              We collect several different types of information for various
              purposes to provide and improve our Service to you.
            </p>

            <h3>Types of Data Collected</h3>
            <h4>Personal Data</h4>
            <p>
              While using our Service, we may ask you to provide us with
              certain personally identifiable information that can be used to
              contact or identify you (&quot;Personal Data&quot;). Personally
              identifiable information may include, but is not limited to:
            </p>
            <ul>
              <li>Email address</li>
              <li>First name and last name (Optional)</li>
              <li>Cookies and Usage Data</li>
            </ul>

            <h4>Usage Data</h4>
            <p>
              We may also collect information on how the Service is accessed
              and used (&quot;Usage Data&quot;). This Usage Data may include
              information such as your computer&apos;s Internet Protocol address
              (e.g. IP address), browser type, browser version, the pages of
              our Service that you visit, the time and date of your visit, the
              time spent on those pages, unique device identifiers and other
              diagnostic data.
            </p>

            <h4>Tracking & Cookies Data</h4>
            <p>
              We use cookies and similar tracking technologies to track the
              activity on our Service and hold certain information. Cookies are
              files with small amount of data which may include an anonymous
              unique identifier. You can instruct your browser to refuse all
              cookies or to indicate when a cookie is being sent. However, if
              you do not accept cookies, you may not be able to use some
              portions of our Service.
            </p>

            <h2>Use of Data</h2>
            <p>AutoNest uses the collected data for various purposes:</p>
            <ul>
              <li>To provide and maintain the Service</li>
              <li>To notify you about changes to our Service</li>
              <li>
                To allow you to participate in interactive features of our
                Service when you choose to do so
              </li>
              <li>To provide customer care and support</li>
              <li>
                To provide analysis or valuable information so that we can
                improve the Service
              </li>
              <li>To monitor the usage of the Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>

            <h2>Transfer Of Data</h2>
            <p>
              Your information, including Personal Data, may be transferred to
              — and maintained on — computers located outside of your state,
              province, country or other governmental jurisdiction where the
              data protection laws may differ than those from your
              jurisdiction.
            </p>
            <p>
              If you are located outside and choose to provide information to
              us, please note that we transfer the data, including Personal
              Data, to and process it there.
            </p>
            <p>
              Your consent to this Privacy Policy followed by your submission
              of such information represents your agreement to that transfer.
            </p>
            <p>
              AutoNest will take all steps reasonably necessary to ensure that
              your data is treated securely and in accordance with this Privacy
              Policy and no transfer of your Personal Data will take place to an
              organization or a country unless there are adequate controls in
              place including the security of your data and other personal
              information.
            </p>

            <h2>Disclosure Of Data</h2>
            <h3>Legal Requirements</h3>
            <p>
              AutoNest may disclose your Personal Data in the good faith belief
              that such action is necessary to:
            </p>
            <ul>
              <li>To comply with a legal obligation</li>
              <li>
                To protect and defend the rights or property of AutoNest
              </li>
              <li>
                To prevent or investigate possible wrongdoing in connection
                with the Service
              </li>
              <li>
                To protect the personal safety of users of the Service or the
                public
              </li>
              <li>To protect against legal liability</li>
            </ul>

            <h2>Security Of Data</h2>
            <p>
              The security of your data is important to us, but remember that
              no method of transmission over the Internet, or method of
              electronic storage is 100% secure. While we strive to use
              commercially acceptable means to protect your Personal Data, we
              cannot guarantee its absolute security.
            </p>

            <h2>Changes To This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on
              this page.
            </p>
            <p>
              We will let you know via email and/or a prominent notice on our
              Service, prior to the change becoming effective and update the
              &quot;last updated&quot; date at the top of this Privacy Policy.
            </p>
            <p>
              You are advised to review this Privacy Policy periodically for any
              changes. Changes to this Privacy Policy are effective when they
              are posted on this page.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us:
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
