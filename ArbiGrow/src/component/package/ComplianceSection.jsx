import { AlertTriangle, Shield, Cpu, CheckCircle2 } from "lucide-react";

export default function ComplianceSection() {
  return (
    <section className="border-t border-white/5 bg-[#070b1f] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 backdrop-blur-sm">
            <AlertTriangle className="size-4 text-red-300" />
            <span className="text-sm text-red-300">Important Risk Disclosure</span>
          </div>
          <h2 className="mb-4 text-3xl font-semibold text-white">
            Security Architecture & Compliance
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Non-Custodial Architecture */}
          <div className="glass-card p-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <Shield className="size-6 text-cyan-400" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Non-Custodial Architecture
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              You maintain full control of your assets at all times. Oxford Financial Ads operates as a non-custodial platform where your funds remain in your wallet under your private key control. Smart contracts execute trades according to predefined parameters without third-party custody.
            </p>
          </div>

          {/* Smart Contract Automation */}
          <div className="glass-card p-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10">
              <Cpu className="size-6 text-blue-400" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Smart Contract Automation
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              All strategy executions are governed by audited smart contracts deployed on Arbitrum Layer-2. Automated protocols handle trade execution, position management, and rebalancing according to algorithmic parameters without human intervention or discretionary control.
            </p>
          </div>

          {/* Complete Wallet Control */}
          <div className="glass-card p-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="size-6 text-green-400" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Complete Wallet Control
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Your connected wallet retains withdrawal rights at all times. You can disconnect, withdraw partial or full balances, and exit strategies according to smart contract parameters. No lock-up periods or withdrawal restrictions beyond standard blockchain confirmation times.
            </p>
          </div>

          {/* Market Risk Disclosure */}
          <div className="glass-card p-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
              <AlertTriangle className="size-6 text-red-400" />
            </div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Market Risk Disclosure
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              All projected performance scenarios are simulations based on historical data and algorithmic models. Past performance does not guarantee future results. Cryptocurrency markets are highly volatile and involve substantial risk of loss. Only allocate capital you can afford to lose.
            </p>
          </div>
        </div>

        {/* Smart Selection / Auto-Upgrade / Badge System Info */}
        <div className="mt-10 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-6">
          <h3 className="mb-2 text-lg font-semibold text-indigo-400">
            Additional Features
          </h3>
          <ul className="ml-4 list-disc text-sm text-gray-400 space-y-1">
            <li>
              <strong>Smart Selection:</strong> Users can view the maximum possible profit per package (e.g., a $100 package progress bar shows 0 to $150).
            </li>
            <li>
              <strong>Auto-Upgrade Option:</strong> Users can upgrade to a larger package anytime by purchasing the new package.
            </li>
            <li>
              <strong>Badge System:</strong> Each package has a badge or medal based on its name (e.g., $10 = 'Micro', $100,000 = 'Sovereign').
            </li>
            <li>
              When a user's profit reaches 150%, the package card shows <span className="text-red-400 font-semibold">Expired</span> and the withdrawal button is locked until a new package is purchased.
            </li>
          </ul>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-6">
          <p className="text-xs leading-relaxed text-gray-400">
            <strong className="text-yellow-400">Legal Notice:</strong> Oxford Financial Ads provides algorithmic trading infrastructure and does not offer investment advice, financial planning, or portfolio management services. This platform is intended for sophisticated users who understand blockchain technology and cryptocurrency market risks. Participation constitutes acceptance of all inherent smart contract, market, technological, and regulatory risks. Consult independent legal, tax, and financial advisors before participating.
          </p>
        </div>
      </div>
    </section>
  );
}