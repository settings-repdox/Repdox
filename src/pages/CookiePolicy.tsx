import { motion } from "framer-motion";
import { Cookie, ShieldCheck, Database, Info, Settings, MousePointer2, ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CookiePolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. What are Cookies?",
      icon: <Cookie className="w-5 h-5 text-purple-400" />,
      content: "Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work or work more efficiently.",
      details: [
        "Stored in your browser's memory.",
        "Allow the platform to remember your session.",
        "Essential for secure authentication."
      ]
    },
    {
      title: "2. How We Use Cookies",
      icon: <Settings className="w-5 h-5 text-cyan-400" />,
      content: "Repdox uses only 'Necessary Cookies' to ensure the platform functions securely and correctly.",
      details: [
        "Authentication: To identify you when you log in.",
        "Security: To protect your data and prevent unauthorized access.",
        "Performance: To ensure the site loads quickly and reliably."
      ]
    },
    {
      title: "3. Types of Cookies We Use",
      icon: <Database className="w-5 h-5 text-amber-400" />,
      content: "We strictly limit our use of cookies to those required for basic operations.",
      details: [
        "Session Cookies: Temporary files that expire when you close your browser.",
        "Persistent Cookies: Essential for remembering your login status across sessions.",
        "Third-Party Cookies: Used by Supabase for secure database authentication."
      ]
    },
    {
      title: "4. Managing Your Cookies",
      icon: <MousePointer2 className="w-5 h-5 text-pink-400" />,
      content: "You have full control over how cookies are used on your device through your browser settings.",
      details: [
        "Most browsers allow you to block or delete cookies.",
        "Note: Disabling necessary cookies will prevent you from logging in.",
        "You can clear your browser cache to remove all existing cookies."
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
            Privacy Framework
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            COOKIE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">POLICY</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We use only essential cookies to provide you with a secure and seamless experience. No tracking, no invasive advertising.
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
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                    {detail}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Security Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-[32px] flex items-center gap-6"
          >
            <div className="p-4 bg-purple-500/10 rounded-2xl">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-purple-400 mb-1">Secure by Default</h4>
              <p className="text-sm text-muted-foreground">
                All cookies used by Repdox and its authentication provider (Supabase) are encrypted and managed using industry-standard security protocols.
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
              <Info className="w-10 h-10 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">More Information</h3>
              <p className="text-muted-foreground mb-8">
                If you have further questions about our use of cookies or other tracking technologies, please reach out.
              </p>
              <Button 
                onClick={() => window.location.href = 'mailto:supportrepdox@gmail.com'}
                className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 h-12 px-8 rounded-xl font-bold"
              >
                supportrepdox@gmail.com
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
