import { motion } from "framer-motion";
import { Shield, Clock, AlertTriangle, RefreshCcw, PackageX, Mail, ArrowLeft, RotateCcw, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function RefundPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Cancellation Policy",
      icon: <RotateCcw className="w-5 h-5 text-purple-400" />,
      content: "Repdox believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:",
      details: [
        "Cancellations will be considered only if the request is made immediately after placing the order.",
        "However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them."
      ]
    },
    {
      title: "2. Perishable Items",
      icon: <PackageX className="w-5 h-5 text-cyan-400" />,
      content: "Policies regarding perishable items like flowers, eatables, etc.",
      details: [
        "Repdox does not accept cancellation requests for perishable items.",
        "However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good."
      ]
    },
    {
      title: "3. Damaged or Defective Items",
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      content: "Steps to take if you receive damaged or defective items.",
      details: [
        "Please report the same to our Customer Service team.",
        "The request will be entertained once the merchant has checked and determined the same at his own end.",
        "This should be reported within Only same day days of receipt of the products."
      ]
    },
    {
      title: "4. Product Not As Expected",
      icon: <Eye className="w-5 h-5 text-pink-400" />,
      content: "What to do if the product received is not as shown on the site or as per your expectations.",
      details: [
        "You must bring it to the notice of our customer service within Only same day days of receiving the product.",
        "The Customer Service Team after looking into your complaint will take an appropriate decision."
      ]
    },
    {
      title: "5. Manufacturer Warranty",
      icon: <Shield className="w-5 h-5 text-green-400" />,
      content: "Handling products that come with a manufacturer warranty.",
      details: [
        "In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them."
      ]
    },
    {
      title: "6. Refund Processing Time",
      icon: <Clock className="w-5 h-5 text-blue-400" />,
      content: "Information regarding the processing time for approved refunds.",
      details: [
        "In case of any Refunds approved by Repdox, it'll take 6-8 Days days for the refund to be processed to the end customer."
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
            CANCELLATION & REFUND <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">POLICY</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Last updated on 18-05-2026. Repdox believes in helping its customers as far as possible, and has therefore a liberal cancellation policy.
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
              <h3 className="text-2xl font-bold mb-2">Policy Inquiries</h3>
              <p className="text-muted-foreground mb-8">
                If you have any questions about this Refund Policy or wish to request a refund, please contact our support team.
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
