import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Disclaimer - Website Copier',
    description: 'Legal Disclaimer for Website Copier',
};

export default function Disclaimer() {
    return (
        <main className="min-h-screen py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/"
                    className="text-primary-400 hover:text-primary-300 mb-8 inline-block"
                >
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-white mb-8">Legal Disclaimer</h1>

                <div className="prose prose-invert prose-gray max-w-none space-y-6 text-gray-300">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-red-400 mt-0 mb-4">⚠️ Important Notice</h2>
                        <p className="text-red-200 mb-0">
                            This tool is provided for legitimate archival purposes only. Misuse of this service
                            may result in civil and criminal liability. Read this disclaimer carefully before using.
                        </p>
                    </div>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. No Liability</h2>
                        <p>
                            The operators of Website Copier (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provide this service on an
                            &quot;as-is&quot; basis and expressly disclaim all liability arising from your use of the
                            Service. We accept no responsibility for:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>How you use content obtained through the Service</li>
                            <li>Copyright or trademark infringement by users</li>
                            <li>Any legal action taken against you</li>
                            <li>Damages resulting from use or inability to use the Service</li>
                            <li>Any harm caused to third parties by your use of the Service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Legitimate Use Only</h2>
                        <p>This Service is intended for legitimate purposes including:</p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Personal archival of websites you own</li>
                            <li>Backing up your own web properties</li>
                            <li>Academic research (with proper permissions)</li>
                            <li>Preserving content you have rights to access offline</li>
                            <li>Web development and testing purposes</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. You Are Responsible</h2>
                        <p className="text-yellow-400 font-medium">
                            By using this Service, you acknowledge and agree that:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>YOU are solely responsible for determining whether you have the right to copy any website</li>
                            <li>YOU are solely responsible for complying with all applicable laws</li>
                            <li>YOU are solely responsible for any consequences of your use</li>
                            <li>YOU will not hold us liable for any claims arising from your use</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Copyright Warning</h2>
                        <p>
                            Most websites are protected by copyright. Copying a website without authorization
                            may constitute copyright infringement punishable by:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Statutory damages up to $150,000 per work (in the US)</li>
                            <li>Actual damages and profits</li>
                            <li>Criminal penalties including fines and imprisonment</li>
                            <li>Injunctive relief and seizure of infringing copies</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Not Legal Advice</h2>
                        <p>
                            Nothing on this website constitutes legal advice. We are not lawyers and cannot
                            advise you on whether your intended use is legal. If you are unsure about your
                            rights, consult a qualified attorney in your jurisdiction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Fair Use Considerations</h2>
                        <p>
                            In some jurisdictions, &quot;fair use&quot; or &quot;fair dealing&quot; may permit limited copying
                            for purposes such as criticism, commentary, news reporting, teaching, scholarship,
                            or research. However, fair use is determined on a case-by-case basis considering:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>The purpose and character of your use</li>
                            <li>The nature of the copyrighted work</li>
                            <li>The amount copied in relation to the whole work</li>
                            <li>The effect on the market value of the original</li>
                        </ul>
                        <p className="mt-4">
                            Copying an entire website is unlikely to qualify as fair use in most circumstances.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Indemnification</h2>
                        <p>
                            You agree to indemnify and hold harmless the Service operators from any claims,
                            damages, losses, liabilities, and expenses (including attorney&apos;s fees) arising
                            from your use of the Service or violation of these terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Service Modifications</h2>
                        <p>
                            We reserve the right to modify, suspend, or discontinue the Service at any time
                            without notice. We may also implement measures to prevent abuse, including but
                            not limited to rate limiting, blocking certain URLs, or requiring additional
                            verification.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Acknowledgment</h2>
                        <p className="text-lg text-white">
                            By using this Service, you acknowledge that you have read, understood, and agree
                            to be bound by this disclaimer, as well as our Terms of Service and Privacy Policy.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
