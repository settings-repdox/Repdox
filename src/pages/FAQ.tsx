import { motion } from "framer-motion";
import { HelpCircle, ChevronRight, MessageCircle, Mail, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const faqs = [
  {
    question: "What is Repdox?",
    answer: "Repdox is an elite platform designed for the next generation of innovators. We provide a comprehensive ecosystem for discovering, participating in, and organizing high-impact tech events, hackathons, and workshops."
  },
  {
    question: "How do I register for an event?",
    answer: "To register for an event, simply browse our Events page, select an event that interests you, and click the 'Register' button. You'll need to create an account or sign in to complete your registration."
  },
  {
    question: "Can I organize my own event on Repdox?",
    answer: "Yes! Repdox offers powerful tools for event organizers. Once you have an account, you can click on 'Create Event' to start setting up your own hackathon or workshop. All events undergo a brief review process to ensure quality for our community."
  },
  {
    question: "What kind of events are hosted here?",
    answer: "We focus on technology-driven events, including hackathons, AI/ML workshops, innovation summits, and beginner-friendly coding sessions. Our goal is to empower builders at all skill levels."
  },
  {
    question: "How do I become a Repdox volunteer?",
    answer: "We're always looking for passionate individuals to join our team! Head over to the 'Join Us' page to see available volunteer positions and submit your application."
  },
  {
    question: "Is there a cost to use the platform?",
    answer: "Repdox is free for participants to browse and join many of our community events. For organizers, we offer various tiers of service depending on the scale and requirements of your event."
  },
  {
    question: "How can I contact support?",
    answer: "If you need assistance, you can visit our Contact page or reach out to us directly via email at supportrepdox@gmail.com. Our team is here to help you with any platform-related issues."
  }
];

export default function FAQ() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4" />
            <span>Support Center</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/70">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to know about the Repdox platform. Can't find the answer you're looking for? Reach out to our team.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl p-6 md:p-10 shadow-2xl"
        >
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-border/30 rounded-2xl px-6 bg-background/20 transition-all hover:bg-background/40 hover:border-primary/30"
              >
                <AccordionTrigger className="text-left py-6 hover:no-underline font-semibold text-lg group">
                  <span className="flex-1 group-data-[state=open]:text-primary transition-colors">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-8 flex flex-col items-center text-center group hover:border-purple-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Still have questions?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Our support team is ready to assist you with any inquiries.
            </p>
            <Button asChild variant="outline" className="rounded-xl border-purple-500/50 hover:bg-purple-500/10">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-8 flex flex-col items-center text-center group hover:border-blue-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Join our Discord</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Connect with the community and get real-time help.
            </p>
            <Button asChild variant="outline" className="rounded-xl border-blue-500/50 hover:bg-blue-500/10">
              <a href="https://discord.gg/TbAqDgy4cw" target="_blank" rel="noopener noreferrer">
                Launch Discord <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
