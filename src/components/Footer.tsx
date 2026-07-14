import { motion } from "framer-motion";
import { MessageCircle, Instagram, Mail, ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { FaDiscord, FaInstagram, FaWhatsapp } from "react-icons/fa";

const footerLinks = {
  events: [
    { label: "Hackathons", href: "/events?type=Hackathon" },
    { label: "Workshops", href: "/events?type=Workshop" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    // { label: "Community", href: "/community" },
  ],
  resources: [
    { label: "Hosting Guidelines", href: "/hosting-guidelines" },
    { label: "FAQs", href: "/faq" },
    { label: "Support", href: "/contact" },
  ],
};

export default function Footer() {
  const { pathname } = useLocation();
  const currentYear = new Date().getFullYear();

  if (pathname.startsWith("/profile")) return null;

  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      {/* Subtle background wash */}
      <div className="absolute inset-0 bg-gradient-subtle" />


      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Logo */}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-accent" />
                <h3 className="font-display text-2xl font-bold tracking-[0.08em] text-foreground">
                  REPDOX
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Think. Build. Transform.<br />
                Empowering the next generation of innovators.
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                {[
                  { icon: FaDiscord, href: "https://discord.gg/y9kRMNn49K", label: "Discord" },
                  { icon: FaInstagram, href: "https://www.instagram.com/repdox.official", label: "Instagram" },
                  { icon: FaWhatsapp, href: "https://chat.whatsapp.com/HhJfHtq7gE411KEYa6qpQP", label: "WhatsApp" },
                ].map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <motion.a
                      key={index}
                      href={social.href}
                       target="_blank"
                       rel="noopener noreferrer"
                       whileHover={{ y: -4 }}
                       whileTap={{ scale: 0.95 }}
                       className="group p-3 rounded-xl bg-card hover:bg-accent/10 border border-border hover:border-accent/40 transition-all duration-300"
                       aria-label={social.label}
                     >
                       <Icon className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                    </motion.a>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
            >
               <h4 className="font-semibold mb-4 text-foreground capitalize">
                 {category}
               </h4>
              <ul className="space-y-3">
                {links.map((link, linkIndex) => (
                  <motion.li
                    key={linkIndex}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                     <Link
                       to={link.href}
                       className="group inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                     >
                       <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -ml-5 group-hover:ml-0 transition-all" />
                       {link.label}
                     </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="pt-8 border-t border-border"
        >
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground/60">
             <p>© {currentYear} Repdox. All rights reserved.</p>
             <div className="flex gap-6">
               <Link to="/privacy" className="hover:text-foreground transition-colors">
                 Privacy Policy
               </Link>
               <Link to="/refund-policy" className="hover:text-foreground transition-colors">
                 Refund Policy
               </Link>
               <Link to="/terms" className="hover:text-foreground transition-colors">
                 Terms of Service
               </Link>
               <Link to="/cookies" className="hover:text-foreground transition-colors">
                 Cookie Policy
               </Link>
             </div>
           </div>
        </motion.div>
      </div>
    </footer>
  );
}
