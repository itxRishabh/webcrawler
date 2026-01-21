import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Privacy Policy - Website Copier',
    description: 'Privacy Policy for Website Copier',
};

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/"
                    className="text-primary-400 hover:text-primary-300 mb-8 inline-block"
                >
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>

                <div className="prose prose-invert prose-gray max-w-none space-y-6 text-gray-300">
                    <p className="text-sm text-gray-400">Last Updated: January 2026</p>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Introduction</h2>
                        <p>
                            This Privacy Policy describes how Website Copier (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;)
                            collects, uses, and protects information when you use our web archival service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Information We Collect</h2>

                        <h3 className="text-xl font-medium text-white mt-6 mb-3">2.1 Information You Provide</h3>
                        <ul className="list-disc list-inside space-y-2">
                            <li>URLs you submit for copying</li>
                            <li>Configuration options you select</li>
                        </ul>

                        <h3 className="text-xl font-medium text-white mt-6 mb-3">2.2 Automatically Collected Information</h3>
                        <ul className="list-disc list-inside space-y-2">
                            <li>IP address</li>
                            <li>Browser type and version</li>
                            <li>Operating system</li>
                            <li>Timestamps of requests</li>
                            <li>Error logs and diagnostic data</li>
                        </ul>

                        <h3 className="text-xl font-medium text-white mt-6 mb-3">2.3 Information We Do NOT Collect</h3>
                        <ul className="list-disc list-inside space-y-2">
                            <li>We do not require user registration or accounts</li>
                            <li>We do not collect personal identification information</li>
                            <li>We do not use tracking cookies for advertising</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. How We Use Information</h2>
                        <p>We use collected information to:</p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Process your website copy requests</li>
                            <li>Maintain and improve the Service</li>
                            <li>Detect and prevent abuse or misuse</li>
                            <li>Comply with legal obligations</li>
                            <li>Respond to law enforcement requests</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Data Retention</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong className="text-white">Copied content:</strong> Automatically deleted after 24 hours</li>
                            <li><strong className="text-white">Request logs:</strong> Retained for up to 30 days for abuse prevention</li>
                            <li><strong className="text-white">Error logs:</strong> Retained for up to 7 days for debugging</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Data Sharing</h2>
                        <p>We do not sell, trade, or rent your information to third parties. We may share information:</p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>When required by law or legal process</li>
                            <li>To respond to valid DMCA or copyright claims</li>
                            <li>To protect our rights, property, or safety</li>
                            <li>With service providers who assist in operating the Service (under strict confidentiality)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Security</h2>
                        <p>
                            We implement reasonable security measures to protect information. However, no
                            method of transmission over the Internet or electronic storage is 100% secure.
                            We cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Third-Party Websites</h2>
                        <p>
                            The content you copy using this Service comes from third-party websites. We are
                            not responsible for the privacy practices of those websites. The copied content
                            may contain tracking scripts or other privacy-impacting code from the original
                            website.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Children&apos;s Privacy</h2>
                        <p>
                            The Service is not intended for users under the age of 13. We do not knowingly
                            collect information from children under 13.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Your Rights</h2>
                        <p>Depending on your jurisdiction, you may have the right to:</p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Access information we hold about you</li>
                            <li>Request deletion of your data</li>
                            <li>Object to processing of your data</li>
                            <li>Data portability</li>
                        </ul>
                        <p className="mt-4">
                            To exercise these rights, please contact us through the channels provided on this website.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. International Users</h2>
                        <p>
                            If you are accessing the Service from outside our hosting jurisdiction, please
                            be aware that your information may be transferred to, stored, and processed in
                            a different country. By using the Service, you consent to this transfer.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify users of any
                            material changes by posting the new policy on this page with an updated revision date.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">12. Contact</h2>
                        <p>
                            For questions about this Privacy Policy, please contact us through the
                            appropriate channels provided on this website.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
