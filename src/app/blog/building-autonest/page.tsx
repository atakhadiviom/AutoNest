
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Lightbulb, CheckCircle, Zap, Target, BookOpen } from "lucide-react";

export default function BuildingAutoNestBlogPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold tracking-tight text-primary">
              Building and Launching AutoNest: Our Journey
            </CardTitle>
            <CardDescription className="text-xl text-muted-foreground pt-2">
              From an idea to a deployed application – a look behind the scenes.
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary">
            <div className="space-y-6">
              <section>
                <h2 className="flex items-center text-2xl font-semibold">
                  <Lightbulb className="mr-3 h-7 w-7 text-accent" />
                  Introduction: The Spark of an Idea
                </h2>
                <p>
                  Every great application starts with a problem to solve or a vision to realize. 
                  For AutoNest, the journey began with [describe the initial problem or idea]. 
                  We envisioned a platform that could [describe the core mission of AutoNest].
                  This post will take you through the key phases of building and launching AutoNest, 
                  sharing our challenges, learnings, and the milestones we celebrated along the way.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="flex items-center text-2xl font-semibold">
                  <Zap className="mr-3 h-7 w-7 text-accent" />
                  Phase 1: Conceptualization and Planning
                </h2>
                <p>
                  Before writing a single line of code, we invested time in [describe planning activities: e.g., market research, defining core features, tech stack decisions].
                  Our primary goals for the Minimum Viable Product (MVP) were [list MVP goals].
                  The technology stack, including Next.js, React, ShadCN UI, Tailwind CSS, Firebase, and Genkit, was chosen because [explain reasons for tech stack choices].
                </p>
                {/* Add more details about the planning phase */}
              </section>

              <Separator />

              <section>
                <h2 className="flex items-center text-2xl font-semibold">
                  <CheckCircle className="mr-3 h-7 w-7 text-accent" />
                  Phase 2: Development Sprints & Key Features
                </h2>
                <p>
                  Development was an iterative process. We focused on building key features such as:
                </p>
                <ul>
                  <li>User Authentication: [Briefly describe how it was implemented and challenges].</li>
                  <li>Workflow/Tool Integration (e.g., Keyword Suggester, Blog Factory): [Describe the process of integrating AI tools or n8n webhooks].</li>
                  <li>Credit System & Billing (PayPal Integration): [Highlight the journey of implementing payments, switching between sandbox and live, server-side logic].</li>
                  <li>Admin Dashboard: [Mention its purpose and key functionalities].</li>
                </ul>
                <p>
                  One of the significant technical challenges we faced was [describe a challenge and how it was overcome].
                </p>
                {/* Add more details about specific features or development cycles */}
              </section>

              <Separator />

              <section>
                <h2 className="flex items-center text-2xl font-semibold">
                  <Target className="mr-3 h-7 w-7 text-accent" />
                  Phase 3: Testing, Deployment, and Launch
                </h2>
                <p>
                  Rigorous testing was crucial. We conducted [describe testing types: e.g., unit tests, integration tests, user acceptance testing].
                  For deployment, we chose Firebase because [explain reasons for choosing Firebase for hosting and functions].
                  The deployment process involved [briefly describe deployment steps and any CI/CD setup].
                  Leading up to the launch, our focus was on [describe pre-launch activities: e.g., final checks, marketing prep].
                </p>
                {/* Add more details about the testing and launch process */}
              </section>

              <Separator />

              <section>
                <h2 className="flex items-center text-2xl font-semibold">
                  <BookOpen className="mr-3 h-7 w-7 text-accent" />
                  Learnings and Future Roadmap
                </h2>
                <p>
                  Throughout this journey, we've learned valuable lessons, such as [mention a key learning].
                  If we were to start over, one thing we might do differently is [mention a reflection].
                  Looking ahead, the roadmap for AutoNest includes [tease future features or improvements]. 
                  We're excited about [express enthusiasm for the future].
                </p>
                <p>
                  Thank you for being a part of the AutoNest story!
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
