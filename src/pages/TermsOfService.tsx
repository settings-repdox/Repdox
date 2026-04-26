import { motion } from "framer-motion";
import { Scale, ShieldCheck, UserPlus, FileWarning, AlertCircle, Ban, ArrowLeft, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
      content: "By accessing or using the Repdox platform, you agree to be bound by these Terms of Service and all applicable laws and regulations in India.",
      details: [
        "Agreement to follow community guidelines.",
        "Acceptance of digital signatures for event registration.",
        "Acknowledgment of our Privacy Policy."
      ]
    },
    {
      title: "2. Eligibility & Accounts",
      icon: <UserPlus className="w-5 h-5 text-cyan-400" />,
      content: "Our services are designed for students and innovators aged 13 and above.",
      details: [
        "Users must provide accurate registration data.",
        "One account per individual is permitted.",
        "You are responsible for all activity under your account.",
        "Unauthorized use of another user's account is prohibited."
      ]
    },
    {
      title: "3. Event Participation",
      icon: <Terminal className="w-5 h-5 text-amber-400" />,
      content: "Rules governing Hackathons, MUNs, and Workshops hosted on the Repdox platform.",
      details: [
        "Adherence to specific event 'Codes of Conduct'.",
        "Fair play and original work requirements.",
        "Respect for judging decisions and results.",
        "Team formation and project submission deadlines."
      ]
    },
    {
      title: "4. Intellectual Property",
      icon: <Scale className="w-5 h-5 text-pink-400" />,
      content: "Protection of Repdox assets and user-generated content.",
      details: [
        "Repdox owns all platform code, logos, and UI designs.",
        "Users retain ownership of their original project submissions.",
        "Repdox is granted a license to showcase projects in its portfolio."
      ]
    },
    {
      title: "5. Prohibited Conduct",
      icon: <Ban className="w-5 h-5 text-red-400" />,
      content: "Activities that will result in immediate account suspension or legal action.",
      details: [
        "Attempting to breach platform security or 'scraping' data.",
        "Harassment, hate speech, or bullying of other participants.",
        "Submitting plagiarized or stolen work.",
        "Misrepresentation of identity or credentials."
      ]
    },
    {
      title: "6. Limitation of Liability",
      icon: <AlertCircle className="w-5 h-5 text-emerald-400" />,
      content: "Legal protections for Repdox regarding service availability and event outcomes.",
      details: [
        "Services are provided 'as is' without warranties.",
        "Not liable for third-party service failures (e.g., Discord, Zoom).",
        "No guarantee of specific event outcomes or sponsorship funding."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#05050e] text-white pt-24 pb-20 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-bold mb-4 uppercase tracking-widest">
            Governing Framework
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            TERMS OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">SERVICE</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            These terms govern your use of the Repdox platform. By using our services, you agree to comply with the following rules and regulations.
          </p>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-[32px] hover:bg-white/[0.07] transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">{section.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 ml-14">
                {section.details.map((detail, dIdx) => (
                  <li key={dIdx} className="flex items-start gap-2 text-sm text-white/70">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 shrink-0 shadow-[0_0:8px_rgba(168,85,247,0.6)]" />
                    {detail}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Warning Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 bg-red-500/5 border border-red-500/20 rounded-[32px] flex items-center gap-6"
          >
            <div className="p-4 bg-red-500/10 rounded-2xl">
              <FileWarning className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-red-400 mb-1">Violation Consequences</h4>
              <p className="text-sm text-muted-foreground">
                Violation of these terms may result in temporary suspension, permanent banning from the Repdox platform, and reporting to relevant educational institutions or authorities.
              </p>
            </div>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center py-12 space-y-6"
          >
            <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] max-w-2xl mx-auto">
              <Scale className="w-10 h-10 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Questions?</h3>
              <p className="text-muted-foreground mb-8">
                If you have any questions regarding these terms, please contact our legal and support team.
              </p>
              <Button 
                onClick={() => window.location.href = 'mailto:supportrepdox@gmail.com'}
                className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 h-12 px-8 rounded-xl font-bold"
              >
                Contact Support
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
