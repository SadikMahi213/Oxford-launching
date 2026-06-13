import { motion } from "motion/react";
import { Gift, Users, Star, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";
import Button from "./Button";

export function MemberBenefits() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const benefits = [
    {
      icon: Gift,
      title: "Sign-Up Bonus",
      description:
        "Start your journey with an instant boost to your portfolio upon successful registration.",
      highlight: "100 OFA Tokens",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      title: "Referral Commission",
      description:
        "Earn 10% commission from your every friend's daily profits you refer to ArbiGrow",
      highlight: "10% Commission",
      color: "from-cyan-500 to-teal-500",
    },
    {
      icon: Star,
      title: "Exclusive Pre-Launch Benefits",
      description: "Early access to new features and premium trading tools",
      highlight: "VIP Access",
      color: "from-purple-500 to-blue-500",
    },
  ];

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-purple-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-cyan-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-cyan-500/20">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Exclusive Rewards
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Member{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Benefits
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Join ArbiGrow and unlock exclusive rewards and benefits designed for
            our valued members
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              {/* Card */}
              <div className="relative h-full p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-500 overflow-hidden">
                <div className="relative flex flex-col items-center text-center md:items-start md:text-left">
                  {/* Icon with animated ring */}
                  <div className="relative mb-6 inline-block">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${benefit.color} rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-300`}
                    ></div>
                    <div
                      className={`relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${benefit.color} bg-opacity-20 border border-white/20 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <benefit.icon className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  {/* Highlight badge */}
                  <div className="mb-4">
                    <span
                      className={`inline-block px-4 py-1.5 rounded-full bg-gradient-to-r ${benefit.color} text-white text-sm font-bold shadow-lg`}
                    >
                      {benefit.highlight}
                    </span>
                  </div>

                  {/* Title & description */}
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors duration-300">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed mb-6">
                    {benefit.description}
                  </p>
                </div>
              </div>

              {/* Optional floating particles */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping delay-75"></div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          {!user && (
            <>
              <p className="text-gray-400 mb-6">
                Ready to unlock these exclusive benefits?
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigate("/login")}
                  fullWidth={false}
                  className=""
                  variant="gradient"
                >
                  Join ArbiGrow Today
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
