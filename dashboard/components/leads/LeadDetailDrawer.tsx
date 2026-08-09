"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Mail, Phone, Globe, MapPin, Building, Briefcase, Calendar, 
  Target, Loader2, ExternalLink, RefreshCw, Archive, CheckSquare, 
  Trash2, User, Cpu, CreditCard, Clock, Copy, Check, Star, CheckCircle, XCircle, MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { 
  updateLeadStatus, 
  regenerateLeadEmail, 
  createGmailDraft 
} from "@/services/firebase/leads.service";

interface LeadDetailDrawerProps {
  lead: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LeadDetailDrawer({ lead, isOpen, onClose }: LeadDetailDrawerProps) {
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  if (!lead) return null;

  // Formatting helpers
  const scoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 70) return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (score >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const priorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    }
  };

  const draftStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "created": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "pending": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default: return "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
    }
  };

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "won": return "bg-emerald-500 text-white";
      case "lost": return "bg-rose-500 text-white";
      case "contacted": return "bg-blue-600 text-white";
      case "archived": return "bg-zinc-700 text-zinc-300";
      default: return "bg-zinc-800 text-zinc-100 border border-zinc-700";
    }
  };

  const copyEmailToClipboard = () => {
    // Strip HTML tags for plain text copying
    const plainText = lead.emailBody?.replace(/<[^>]*>/g, "") || "";
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    toast("Email body copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateWhatsAppFallback = (l: any) => {
    const clientName = l.clientName || "there";
    const companyName = l.companyName || "your company";
    const category = l.leadCategory || "digital marketing & growth";
    return `Hi ${clientName},\n\nWe came across your requirement for ${category} for ${companyName}.\n\nAt Grox Studio, we specialize in custom web/mobile development, brand positioning, and AI automation for growing businesses.\n\nWould you be open for a quick 5-minute chat or call to discuss how we can support ${companyName}?\n\nBest regards,\nGrox Studio Team`;
  };

  const rawWhatsappText = lead.whatsappMessage || generateWhatsAppFallback(lead);
  const whatsappText = rawWhatsappText.replace(/\*/g, "");

  const copyWhatsAppToClipboard = () => {
    navigator.clipboard.writeText(whatsappText);
    setCopiedWhatsApp(true);
    toast("WhatsApp message copied to clipboard!", "success");
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  };

  const getFormattedPhone = (phoneStr?: string) => {
    if (!phoneStr) return "";
    let digits = phoneStr.replace(/[^0-9]/g, "");
    if (digits.length === 10) {
      digits = "91" + digits;
    }
    return digits;
  };

  const cleanPhone = getFormattedPhone(lead.phone);
  const whatsappLink = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;

  const getEmailPlainText = (htmlBody?: string) => {
    if (!htmlBody) return "";
    return htmlBody
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<li>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const emailPlainText = getEmailPlainText(lead.emailBody);
  const gmailComposeLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email || "")}&su=${encodeURIComponent(lead.emailSubject || "Project Discussion - Grox Studio")}&body=${encodeURIComponent(emailPlainText)}`;

  // Drawer Action Handlers
  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(newStatus);
      await updateLeadStatus(lead.id, newStatus);
      toast(`Lead marked as ${newStatus}`, "success");
    } catch (err) {
      toast("Failed to update status", "error");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleRegenerateEmail = async () => {
    try {
      setRegenerating(true);
      await regenerateLeadEmail(lead.id);
      toast("Outreach email successfully regenerated!", "success");
    } catch (err: any) {
      toast(err.message || "Failed to regenerate email", "error");
    } finally {
      setRegenerating(false);
    }
  };

  const handleCreateDraft = async () => {
    try {
      setCreatingDraft(true);
      await createGmailDraft(lead.id);
      toast("Gmail Draft created successfully!", "success");
    } catch (err: any) {
      toast(err.message || "Failed to create Gmail Draft", "error");
    } finally {
      setCreatingDraft(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-950 border-l border-border h-full shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-zinc-900/40">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-primary animate-pulse" />
                  LEAD ID: {lead.id?.substring(0, 8)}...
                </span>
                <h2 className="text-base font-bold text-foreground truncate max-w-[450px]">
                  {lead.companyName || "Unknown Company"}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Score & Key Badges Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${scoreColor(lead.leadScore)}`}>
                  <span className="text-[10px] uppercase font-mono tracking-wider opacity-60">Lead Score</span>
                  <span className="text-xl font-bold font-mono mt-1">{lead.leadScore}</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-zinc-900/20 flex flex-col items-center justify-center text-center text-blue-400">
                  <span className="text-[10px] uppercase font-mono tracking-wider opacity-60 text-muted-foreground">Confidence</span>
                  <span className="text-xl font-bold font-mono mt-1">{lead.confidenceScore}%</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-zinc-900/20 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Priority</span>
                  <Badge className={`mt-1.5 capitalize text-[10px] ${priorityColor(lead.priority)}`}>
                    {lead.priority}
                  </Badge>
                </div>
                <div className="p-3 rounded-xl border border-border bg-zinc-900/20 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Draft Status</span>
                  <Badge className={`mt-1.5 capitalize text-[10px] ${draftStatusColor(lead.draftStatus)}`}>
                    {lead.draftStatus}
                  </Badge>
                </div>
              </div>

              {/* Extracted Details Grid */}
              <div className="p-5 rounded-xl border border-border bg-zinc-900/10 space-y-4">
                <h3 className="text-xs font-semibold text-foreground border-b border-border/40 pb-2">Client Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <User className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="text-foreground font-medium">{lead.clientName || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                    {lead.email ? (
                      <a 
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline truncate"
                      >
                        {lead.email}
                      </a>
                    ) : (
                      <span>N/A</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a>
                    ) : (
                      <span>N/A</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
                    {lead.website ? (
                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                        {lead.website} <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    ) : (
                      <span>N/A</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="text-foreground">{lead.location || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Building className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="text-foreground">{lead.industry || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Requirements & Budget Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-zinc-900/10 space-y-2.5">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-primary" /> Budget & Timeline
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-semibold text-foreground">{lead.budget}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timeline:</span>
                      <span className="font-semibold text-foreground">{lead.timeline}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-zinc-900/10 space-y-2.5">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-primary" /> Service Category
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Main Category:</span>
                      <span className="font-semibold text-foreground">{lead.leadCategory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">WhatsApp Group:</span>
                      <span className="font-mono text-foreground">{lead.originalWhatsAppGroup || "Leads - Grox Studio"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Services & Technologies */}
              <div className="space-y-4">
                {lead.requiredServices && lead.requiredServices.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Required Services</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.requiredServices.map((service: string) => (
                        <Badge key={service} variant="secondary" className="text-[10px]">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {lead.mentionedTechnologies && lead.mentionedTechnologies.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Technologies Mentioned</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.mentionedTechnologies.map((tech: string) => (
                        <Badge key={tech} variant="accent" className="text-[10px]">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Summary */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-primary" /> AI Lead Summary
                </span>
                <div className="p-4 rounded-xl border border-border bg-zinc-900/10 text-xs leading-relaxed text-muted-foreground">
                  {lead.aiSummary || lead.projectSummary}
                </div>
              </div>

              {/* Outreach Email Draft */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                    <Mail className="w-3.5 h-3.5 text-primary" /> Generated Outreach Email
                  </span>
                  <div className="flex items-center gap-3">
                    <a
                      href={gmailComposeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 hover:underline font-mono font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Draft in Gmail
                    </a>
                    <button 
                      onClick={copyEmailToClipboard}
                      className="text-xs text-primary flex items-center gap-1.5 hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Email
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-zinc-900/30 overflow-hidden text-xs">
                  <div className="px-4 py-2.5 bg-zinc-900/70 border-b border-border flex flex-col gap-0.5">
                    <div className="flex text-muted-foreground">
                      <span className="w-14 shrink-0 font-medium">To:</span>
                      <span className="text-foreground truncate">{lead.email || "— (No email provided)"}</span>
                    </div>
                    <div className="flex text-muted-foreground">
                      <span className="w-14 shrink-0 font-medium">Subject:</span>
                      <span className="text-foreground font-semibold truncate">{lead.emailSubject}</span>
                    </div>
                  </div>
                  <div className="p-4 leading-relaxed text-muted-foreground min-h-[12rem] bg-zinc-950/40">
                    {lead.emailBody ? (
                      <div 
                        className="prose prose-sm prose-invert max-w-none space-y-3"
                        dangerouslySetInnerHTML={{ __html: lead.emailBody }} 
                      />
                    ) : (
                      <p className="text-zinc-500 italic">No email draft generated.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Generated Outreach WhatsApp Message (only shown if phone number is provided) */}
              {Boolean(lead.phone && lead.phone.trim() !== "" && lead.phone !== "N/A") && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1.5 font-bold">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Generated WhatsApp Message
                    </span>
                    <div className="flex items-center gap-3">
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-mono font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" /> Open Draft in WhatsApp
                        </a>
                      )}
                      <button 
                        onClick={copyWhatsAppToClipboard}
                        className="text-xs text-emerald-400 flex items-center gap-1.5 hover:underline bg-transparent border-0 cursor-pointer font-medium"
                      >
                        {copiedWhatsApp ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Message
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-zinc-900/30 overflow-hidden text-xs">
                    <div className="px-4 py-2 bg-emerald-950/30 border-b border-emerald-500/20 flex flex-col gap-0.5">
                      <div className="flex text-muted-foreground text-[11px]">
                        <span className="w-14 shrink-0 font-medium text-emerald-400">To:</span>
                        <span className="text-foreground truncate font-mono">
                          {lead.clientName ? `${lead.clientName} (${lead.phone})` : lead.phone}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 leading-relaxed text-zinc-200 min-h-[7rem] bg-zinc-950/60 font-sans whitespace-pre-wrap">
                      {whatsappText}
                    </div>
                  </div>
                </div>
              )}

              {/* Original WhatsApp Message */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" /> Original WhatsApp Message
                </span>
                <div className="p-4 rounded-xl border border-border bg-zinc-900/5 font-mono text-[11px] leading-relaxed text-zinc-500 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {lead.originalMessage}
                </div>
              </div>
            </div>

            {/* Footer / Call-To-Action Panel */}
            <div className="p-6 border-t border-border bg-zinc-900/30 flex flex-col gap-3 shrink-0">
              <div className="flex gap-2.5">
                {/* Close Button */}
                <Button
                  onClick={onClose}
                  className="flex-1 text-xs gap-1.5 font-semibold cursor-pointer"
                >
                  <X className="w-4 h-4" /> Close
                </Button>

                {/* Regenerate Email Button */}
                <Button
                  variant="outline"
                  onClick={handleRegenerateEmail}
                  disabled={regenerating}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  {regenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Regenerate
                </Button>
              </div>

              {/* Status Management Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">Mark Status:</span>
                <div className="flex gap-1.5 flex-wrap">
                  <Button 
                    variant={lead.status === "Contacted" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleStatusChange("Contacted")}
                    disabled={updatingStatus !== null}
                    className="h-8 text-[11px] px-2.5"
                  >
                    Contacted
                  </Button>
                  <Button 
                    variant={lead.status === "Won" ? "secondary" : "outline"} 
                    size="sm" 
                    onClick={() => handleStatusChange("Won")}
                    disabled={updatingStatus !== null}
                    className="h-8 text-[11px] px-2.5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                  >
                    Won
                  </Button>
                  <Button 
                    variant={lead.status === "Lost" ? "destructive" : "outline"} 
                    size="sm" 
                    onClick={() => handleStatusChange("Lost")}
                    disabled={updatingStatus !== null}
                    className="h-8 text-[11px] px-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    Lost
                  </Button>
                  <Button 
                    variant={lead.status === "Archived" ? "secondary" : "outline"} 
                    size="sm" 
                    onClick={() => handleStatusChange("Archived")}
                    disabled={updatingStatus !== null}
                    className="h-8 text-[11px] px-2.5 text-zinc-400 hover:bg-zinc-800"
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
