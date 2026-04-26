import { motion } from "framer-motion";
import { ArrowLeft, Shield, FileText, CheckCircle2, MessageSquare, Info, Sparkles, Trophy, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function HostingGuidelines() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Scope of Services",
      icon: <FileText className="w-5 h-5 text-purple-400" />,
      content: "Repdox handles event concept design, end-to-end execution, marketing, and participant management.",
      subpoints: [
        "Event Architecture (Hackathons, MUNs, Workshops)",
        "Logistics & Registrations",
        "Marketing & Outreach",
        "Participant Lifecycle Management"
      ]
    },
    {
      title: "2. Roles & Responsibilities",
      icon: <CheckCircle2 className="w-5 h-5 text-cyan-400" />,
      content: "Clear boundaries ensure success. The host provides the venue and final approvals, while Repdox manages the execution.",
      subpoints: [
        "Client: Venue, permissions, and final authority",
        "Repdox: Strategy, vendor coordination, and tech",
        "Joint: On-ground volunteers and branding"
      ]
    },
    {
      title: "3. Timeline Commitments",
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      content: "To maintain standards, we require specific lead times for preparation.",
      subpoints: [
        "Hackathons: 8–12 weeks",
        "MUNs: 6–8 weeks",
        "Workshops: 2–4 weeks"
      ]
    },
    {
      title: "5. Branding & Creative Control",
      icon: <Sparkles className="w-5 h-5 text-pink-400" />,
      content: "Branding requires mutual approval. Repdox can use the event in its professional portfolio.",
      subpoints: [
        "Mutual approval on all assets",
        "Sponsor placements pre-approved",
        "Media rights for portfolio use"
      ]
    },
    {
      title: "6. Sponsorship Policy",
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      content: "Sponsorship outreach is effort-based and not guaranteed. Sponsors need mutual approval.",
      subpoints: [
        "Effort-based outreach",
        "Predefined revenue split",
        "Mutual sponsor approval"
      ]
    },
    {
      title: "7. Communication Protocol",
      icon: <MessageSquare className="w-5 h-5 text-green-400" />,
      content: "Single point of contact from both sides with bi-weekly meetings for transparency.",
      subpoints: [
        "Dedicated SPOCs",
        "Bi-weekly strategy meetings",
        "Documented approvals"
      ]
    },
    {
      title: "8. Risk & Contingency Planning",
      icon: <Shield className="w-5 h-5 text-red-400" />,
      content: "Repdox does not provide redundant backups for speakers or host-provided technical infrastructure.",
      subpoints: [
        "Host handles primary tech infra",
        "Force Majeure coverage",
        "Speaker backups not included"
      ]
    },
    {
      title: "9. Participant Experience",
      icon: <Users className="w-5 h-5 text-blue-400" />,
      content: "We ensure smooth registration, clear scheduling, fair judging, and professional moderation.",
      subpoints: [
        "Digital registration & check-in",
        "Transparent judging systems",
        "Professional moderation"
      ]
    },
    {
      title: "10. Legal & Compliance",
      icon: <Shield className="w-5 h-5 text-purple-400" />,
      content: "Adherence to local regulations, data privacy standards, and our professional Code of Conduct.",
      subpoints: [
        "Regulatory compliance",
        "Strict Data Privacy",
        "Code of Conduct enforcement"
      ]
    },
    {
      title: "11. Cancellation & Refund",
      icon: <Info className="w-5 h-5 text-gray-400" />,
      content: "Defined refund conditions and deadlines based on non-refundable advance and incurred costs.",
      subpoints: [
        "50% advance non-refundable",
        "Incurred costs forfeiture",
        "Per-event deadline specifics"
      ]
    },
    {
      title: "12. Post-Event Deliverables",
      icon: <FileText className="w-5 h-5 text-cyan-400" />,
      content: "Within 14 days, Repdox provides impact reports, media assets, and feedback analysis.",
      subpoints: [
        "Comprehensive Impact Reports",
        "Professional Media Assets",
        "Participant Data Analytics"
      ]
    },
    {
      title: "13. Code of Collaboration",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      content: "Respect for deadlines, professional communication, and no last-minute major structural changes.",
      subpoints: [
        "Deadline adherence",
        "Structural stability (15 days)",
        "Transparent communication"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-bold mb-4">
            REPDOX HOSTING FRAMEWORK
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            COLLABORATION <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">GUIDELINES</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about hosting your events through the Repdox platform.
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
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 ml-14">
                {section.subpoints.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-center gap-2 text-sm text-white/80">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Budget Section (Inserted at index 3 visually) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 backdrop-blur-xl p-8 rounded-[32px] order-4"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <Info className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">4. Budget & Financials</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Transparency is key. We work with fixed fees or revenue share models.
                </p>
                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 inline-block">
                  <p className="text-sm font-bold text-amber-200">
                    * 50% non-refundable advance required to initiate work.
                  </p>
                </div>
              </div>
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
              <MessageSquare className="w-10 h-10 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Need more info?</h3>
              <p className="text-muted-foreground mb-8">
                For detailed pricing, custom hosting queries, or specific legal inquiries, contact the Repdox team directly.
              </p>
              <Button 
                onClick={() => window.location.href = 'mailto:supportrepdox@gmail.com'}
                className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 h-12 px-8 rounded-xl font-bold"
              >
                Contact Repdox Team
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
