import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'DMCA Policy - Website Copier',
    description: 'DMCA and Copyright Policy for Website Copier',
};

export default function DMCAPolicy() {
    return (
        <main className="min-h-screen py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/"
                    className="text-primary-400 hover:text-primary-300 mb-8 inline-block"
                >
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-white mb-8">DMCA & Copyright Policy</h1>

                <div className="prose prose-invert prose-gray max-w-none space-y-6 text-gray-300">
                    <p className="text-sm text-gray-400">Last Updated: January 2026</p>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Our Commitment</h2>
                        <p>
                            Website Copier respects the intellectual property rights of others and expects
                            users of our Service to do the same. We will respond to notices of alleged
                            copyright infringement that comply with the Digital Millennium Copyright Act
                            (DMCA) and other applicable intellectual property laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Service Nature</h2>
                        <p>
                            Website Copier is a tool that allows users to create temporary, local copies of
                            publicly accessible websites. We do not:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Host or store user-generated copies permanently (auto-deleted after 24 hours)</li>
                            <li>Index or make copied content publicly searchable</li>
                            <li>Distribute copies to third parties</li>
                            <li>Endorse or approve of any specific use of copied content</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. User Responsibility</h2>
                        <p>
                            Users of this Service are solely responsible for ensuring that their use of
                            copied content complies with all applicable copyright laws. Before copying any
                            website, users should:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Verify they have the right to copy the content</li>
                            <li>Review the target website&apos;s Terms of Service</li>
                            <li>Consider whether their use qualifies as &quot;fair use&quot;</li>
                            <li>Obtain necessary permissions from copyright holders</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. DMCA Takedown Procedure</h2>
                        <p>
                            If you believe that content available through our Service infringes your copyright,
                            you may submit a DMCA takedown notice. Your notice must include:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 mt-2">
                            <li>Your physical or electronic signature</li>
                            <li>Identification of the copyrighted work claimed to be infringed</li>
                            <li>Identification of the material claimed to be infringing and its location</li>
                            <li>Your contact information (address, phone number, email)</li>
                            <li>A statement that you have a good faith belief that the use is not authorized</li>
                            <li>A statement, under penalty of perjury, that the information is accurate and you are authorized to act on behalf of the copyright owner</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Counter-Notification</h2>
                        <p>
                            If you believe your content was wrongly removed, you may submit a counter-notification
                            containing:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 mt-2">
                            <li>Your physical or electronic signature</li>
                            <li>Identification of the material that was removed</li>
                            <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake</li>
                            <li>Your name, address, and phone number</li>
                            <li>A statement consenting to jurisdiction of federal court</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Response Time</h2>
                        <p>
                            We will respond to valid DMCA notices within 24-48 hours. Upon receiving a valid
                            notice, we will:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li>Remove or disable access to the allegedly infringing material</li>
                            <li>Notify the user who created the copy (if identifiable)</li>
                            <li>Document the takedown for our records</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Repeat Infringers</h2>
                        <p>
                            We maintain a policy of terminating access for users who are repeat infringers.
                            Users who repeatedly violate copyright laws may be permanently banned from using
                            the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. False Claims Warning</h2>
                        <p className="text-yellow-400">
                            ⚠️ Please note that under Section 512(f) of the DMCA, any person who knowingly
                            materially misrepresents that material is infringing may be subject to liability
                            for damages, including costs and attorney&apos;s fees.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Contact for DMCA Notices</h2>
                        <div className="bg-gray-800/50 rounded-xl p-6 mt-4">
                            <p className="text-white font-medium mb-2">DMCA Agent</p>
                            <p>Email: dmca@[your-domain].com</p>
                            <p className="mt-4 text-sm text-gray-400">
                                Please include &quot;DMCA Notice&quot; in the subject line of your email.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. International Users</h2>
                        <p>
                            For users outside the United States, we will also respond to equivalent copyright
                            infringement notices under applicable local laws, including but not limited to
                            the EU Copyright Directive and similar legislation.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
