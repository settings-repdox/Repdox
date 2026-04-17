import { motion } from "framer-motion";
import { MessageCircle, Instagram, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { FaDiscord, FaInstagram } from "react-icons/fa";

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
    { label: "Event Guidelines", href: "#" },
    { label: "FAQs", href: "#" },
    { label: "Support", href: "/contact" },
  ],
};

export default function Footer() {
  const { pathname } = useLocation();
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubscribed(true);
      setEmail("");
      setTimeout(() => setIsSubscribed(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  if (pathname.startsWith("/profile")) return null;

  return (
    <footer className="relative overflow-hidden border-t border-border/30 bg-background/80 backdrop-blur-sm">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent_70%)]" />


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
              {/* Logo with glow effect */}
              <motion.h3
                className="text-4xl md:text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 hover:drop-shadow-lg"
                whileHover={{
                  scale: 1.02,
                }}
                transition={{ duration: 0.3 }}
              >
                Repdox
              </motion.h3>
              <p className="text-muted-foreground leading-relaxed">
                Think. Build. Transform.<br />
                Empowering the next generation of innovators.
              </p>

              {/* Newsletter signup */}
              <motion.form
                onSubmit={handleNewsletterSubscribe}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-3"
              >
                <p className="text-sm font-semibold text-foreground/80">Subscribe to our newsletter</p>
                <div className="flex gap-2">
                  <motion.input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubscribed || isLoading}
                    whileFocus={{ scale: 1.02 }}
                    className="flex-1 px-4 py-2 rounded-lg bg-card/50 border border-border/30 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                  />
                  <motion.button
                    type="submit"
                    disabled={isSubscribed || isLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50"
                  >
                    {isSubscribed ? "✓" : isLoading ? "..." : "Subscribe"}
                  </motion.button>
                </div>
                {isSubscribed && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-500 text-xs flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Thanks for subscribing!
                  </motion.p>
                )}
              </motion.form>
              
              {/* Social Links */}
              <div className="flex gap-3">
                {[
                  { icon: FaDiscord, href: "https://discord.gg/TbAqDgy4cw", label: "Discord", color: "from-indigo-500 to-blue-500", glow: "rgba(79, 70, 229, 0.5)" },
                  { icon: FaInstagram, href: "https://www.instagram.com/repdox.official", label: "Instagram", color: "from-pink-500 to-rose-500", glow: "rgba(236, 72, 153, 0.5)" },
                ].map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <motion.a
                      key={index}
                      href={social.href}
                       target="_blank"
                       rel="noopener noreferrer"
                       whileHover={{
                         y: -6,
                         scale: 1.15,
                       }}
                       whileTap={{ scale: 0.95 }}
                       className="group relative p-3 rounded-xl bg-accent/10 hover:bg-accent/20 border border-border transition-all duration-300"
                       style={{
                         boxShadow: "0 0 0 rgba(0,0,0,0)",
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.boxShadow = `0 0 20px ${social.glow}`;
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
                       }}
                       aria-label={social.label}
                     >
                       <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <motion.div
                        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 bg-gradient-to-br ${social.color}`}
                        transition={{ duration: 0.3 }}
                      />
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
          className="pt-8 border-t border-white/10"
        >
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground/60">
             <p>© {currentYear} Repdox. All rights reserved.</p>
             <div className="flex gap-6">
               <Link to="#" className="hover:text-foreground transition-colors">
                 Privacy Policy
               </Link>
               <Link to="#" className="hover:text-foreground transition-colors">
                 Terms of Service
               </Link>
               <Link to="#" className="hover:text-foreground transition-colors">
                 Cookie Policy
               </Link>
             </div>
           </div>
        </motion.div>
      </div>
    </footer>
  );
}
