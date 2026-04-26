import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Database, UserCheck, Bell, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Information We Collect",
      icon: <Database className="w-5 h-5 text-purple-400" />,
      content: "We collect information you provide directly to us when you register for an event, apply for a volunteer position, or communicate with us.",
      details: [
        "Personal Identifiers: Name, email address, phone number.",
        "Academic Details: School/College, branch, and class/year.",
        "Social Identifiers: Discord ID (if linked).",
        "Application Data: Reasons for joining, interests, and availability."
      ]
    },
    {
      title: "2. How We Use Your Information",
      icon: <UserCheck className="w-5 h-5 text-cyan-400" />,
      content: "Your data is used strictly for administrative and communication purposes related to Repdox activities.",
      details: [
        "Processing event registrations and volunteer applications.",
        "Communicating schedule updates and interview links.",
        "Improving our platform experience and security.",
        "Ensuring compliance with our community standards."
      ]
    },
    {
      title: "3. Data Storage & Security",
      icon: <Lock className="w-5 h-5 text-amber-400" />,
      content: "We use industry-standard security measures to protect your data. Your information is stored securely via Supabase and hosted on Vercel.",
      details: [
        "Encrypted data transmission (SSL/TLS).",
        "Secure database access controls.",
        "Regular security audits and monitoring."
      ]
    },
    {
      title: "4. Cookies Policy",
      icon: <Shield className="w-5 h-5 text-pink-400" />,
      content: "We use only essential cookies necessary for the platform to function correctly.",
      details: [
        "Authentication: To keep you logged in during your session.",
        "Security: To prevent fraudulent activities.",
        "Preference: To remember your basic UI settings."
      ]
    },
    {
      title: "5. Third-Party Services",
      icon: <Bell className="w-5 h-5 text-green-400" />,
      content: "We may share minimal data with trusted third-party services only when necessary to provide our services.",
      details: [
        "Supabase: Database management and authentication.",
        "Vercel: Application hosting and performance monitoring.",
        "Google Meet: Conducting virtual interviews.",
        "Discord: Managing community communication (if linked)."
      ]
    },
    {
      title: "6. Your Rights & Age Limit",
      icon: <Eye className="w-5 h-5 text-blue-400" />,
      content: "Repdox is designed for users aged 13 and above. You have full control over your data.",
      details: [
        "Age Restriction: Users must be 13+ to register.",
        "Access: You can view and update your profile at any time.",
        "Deletion: You can request account deletion by contacting us.",
        "Correction: You can rectify any inaccurate personal data."
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-bold mb-4 uppercase tracking-wider">
            Legal & Compliance
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            PRIVACY <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">POLICY</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Last Updated: April 2026. We respect your privacy and are committed to protecting your personal data in accordance with Indian regulations.
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

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center py-12 space-y-6"
          >
            <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] max-w-2xl mx-auto">
              <Mail className="w-10 h-10 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Privacy Inquiries</h3>
              <p className="text-muted-foreground mb-8">
                If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact our support team.
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
