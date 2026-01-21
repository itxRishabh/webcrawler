import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Terms of Service - Website Copier',
    description: 'Terms of Service for Website Copier',
};

export default function TermsOfService() {
    return (
        <main className="min-h-screen py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/"
                    className="text-primary-400 hover:text-primary-300 mb-8 inline-block"
                >
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>

                <div className="prose prose-invert prose-gray max-w-none space-y-6 text-gray-300">
                    <p className="text-sm text-gray-400">Last Updated: January 2026</p>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using Website Copier (&quot;the Service&quot;), you agree to be bound by these
                            Terms of Service. If you do not agree to these terms, you must not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Description of Service</h2>
                        <p>
                            Website Copier is a web archival tool that allows users to create offline copies of
                            publicly accessible websites. The Service downloads HTML, CSS, JavaScript, images,
                            and other static assets from websites and packages them for offline viewing.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. User Responsibilities</h2>
                        <p><strong className="text-white">You agree that you will:</strong></p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Only copy websites that you own or have explicit permission to copy</li>
                            <li>Respect the intellectual property rights of website owners</li>
                            <li>Comply with the target website&apos;s Terms of Service and robots.txt directives</li>
                            <li>Not use the Service for any illegal purpose</li>
                            <li>Not use copied content for commercial purposes without proper authorization</li>
                            <li>Not attempt to bypass access controls, authentication systems, or paywalls</li>
                            <li>Not use the Service to harass, harm, or overload target websites</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Prohibited Uses</h2>
                        <p><strong className="text-white">You may NOT use this Service to:</strong></p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Copy copyrighted content without authorization</li>
                            <li>Mirror websites for the purpose of impersonation or phishing</li>
                            <li>Create fake or fraudulent copies of websites</li>
                            <li>Violate any applicable local, state, national, or international law</li>
                            <li>Infringe upon the rights of others</li>
                            <li>Distribute malware or harmful code</li>
                            <li>Engage in competitive intelligence gathering without consent</li>
                            <li>Scrape personal data in violation of privacy laws (GDPR, CCPA, etc.)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Intellectual Property</h2>
                        <p>
                            The Service does not claim any ownership over content copied using the tool.
                            All intellectual property rights in copied content remain with the original
                            copyright holders. Users are solely responsible for ensuring they have the
                            rights to copy and use any content obtained through the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Disclaimer of Warranties</h2>
                        <p>
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                        <p className="mt-4">
                            We do not warrant that the Service will be uninterrupted, error-free, or secure.
                            We make no guarantees about the accuracy, completeness, or quality of any copies
                            created using the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Limitation of Liability</h2>
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE SERVICE OPERATORS,
                            THEIR AFFILIATES, OR THEIR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
                            WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR
                            OTHER INTANGIBLE LOSSES, RESULTING FROM:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Your use or inability to use the Service</li>
                            <li>Any unauthorized access to or use of our servers</li>
                            <li>Any content obtained from the Service</li>
                            <li>Any legal action taken against you as a result of your use of the Service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Indemnification</h2>
                        <p>
                            You agree to indemnify, defend, and hold harmless the Service operators and their
                            affiliates from and against any claims, liabilities, damages, losses, and expenses,
                            including reasonable attorney&apos;s fees, arising out of or in any way connected with
                            your access to or use of the Service, your violation of these Terms, or your
                            infringement of any intellectual property or other rights of any third party.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. DMCA Compliance</h2>
                        <p>
                            We respect the intellectual property rights of others. If you believe that your
                            copyrighted work has been copied in a way that constitutes copyright infringement,
                            please see our <Link href="/dmca" className="text-primary-400 hover:underline">DMCA Policy</Link>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. Termination</h2>
                        <p>
                            We reserve the right to terminate or suspend your access to the Service immediately,
                            without prior notice or liability, for any reason whatsoever, including without
                            limitation if you breach these Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these Terms at any time. We will notify users of
                            any material changes by posting the new Terms on this page. Your continued use of
                            the Service after such modifications constitutes your acceptance of the updated Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">12. Governing Law</h2>
                        <p>
                            These Terms shall be governed by and construed in accordance with the laws of the
                            jurisdiction in which the Service operator is located, without regard to its
                            conflict of law provisions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">13. Contact</h2>
                        <p>
                            For questions about these Terms of Service, please contact us through the
                            appropriate channels provided on this website.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
