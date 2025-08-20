import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, ShieldCheckIcon, BoltIcon, CogIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Board3 - AI-Powered Cloud Infrastructure Platform',
  description:
    'Transform cloud infrastructure management with visual design tools and AI automation.',
};

const features = [
  {
    name: 'Visual Designer',
    description:
      'Drag-and-drop interface for building cloud architectures with real-time Terraform generation.',
    icon: CogIcon,
  },
  {
    name: 'AI-Powered Generation',
    description:
      'Natural language processing to automatically generate infrastructure designs and code.',
    icon: BoltIcon,
  },
  {
    name: 'Military-Grade Security',
    description:
      'Zero-trust architecture with AES-256 encryption and comprehensive security controls.',
    icon: ShieldCheckIcon,
  },
];

export default function HomePage(): React.JSX.Element {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative isolate px-6 pt-14 lg:px-8">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-brand-400 to-brand-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-muted-foreground ring-1 ring-border hover:ring-ring">
              🎉 Foundation Phase Complete.{' '}
              <Link href="/docs" className="font-semibold text-brand-600">
                <span className="absolute inset-0" aria-hidden="true" />
                Read documentation <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              AI-Powered Cloud Infrastructure Platform
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Design, deploy, and manage cloud infrastructure with visual tools and AI automation.
              Reduce setup time by 50% while enforcing security and cost optimization from day one.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth/signin"
                className="rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Get started
              </Link>
              <Link
                href="/docs"
                className="text-sm font-semibold leading-6 text-foreground hover:text-brand-600"
              >
                Learn more <ArrowRightIcon className="ml-1 inline h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-brand-400 to-brand-600 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-brand-600">
              Modern Infrastructure Management
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to manage cloud infrastructure
            </p>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Board3 combines visual design, AI automation, and enterprise security to create the
              most advanced cloud infrastructure management platform.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-foreground">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-muted-foreground">
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-brand-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your infrastructure?
              <br />
              Start building with Board3 today.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-brand-100">
              Join the future of cloud infrastructure management with military-grade security and
              sub-millisecond performance.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth/signin"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-600 shadow-sm hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get started
              </Link>
              <Link
                href="/contact"
                className="text-sm font-semibold leading-6 text-white hover:text-brand-100"
              >
                Contact sales <ArrowRightIcon className="ml-1 inline h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
