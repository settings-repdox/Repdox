"use client"

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Calendar, Users, Trophy, MessageCircle, FileText, Link as LinkIcon, HelpCircle } from "lucide-react";

interface Props {
  eventType?: string;
  scheduleText: string;
  setScheduleText: (v: string) => void;
  teamsText: string;
  setTeamsText: (v: string) => void;
  committeesText?: string;
  setCommitteesText?: (v: string) => void;
  prizeText?: string;
  setPrizeText?: (v: string) => void;
  rolesText?: string;
  setRolesText?: (v: string) => void;
  
  // Lists
  faqs?: Array<{ question: string; answer: string }>;
  setFaqs?: (v: Array<{ question: string; answer: string }>) => void;
  
  speakers?: Array<{ id: string; name: string; role?: string }>;
  setSpeakers?: (v: Array<{ id: string; name: string; role?: string }>) => void;
  
  resources?: Array<{ id: string; title: string; link?: string }>;
  setResources?: (v: Array<{ id: string; title: string; link?: string }>) => void;
}

export default function EventBuilderExtensions({
  eventType,
  scheduleText, setScheduleText,
  teamsText, setTeamsText,
  committeesText, setCommitteesText,
  prizeText, setPrizeText,
  rolesText, setRolesText,
  faqs, setFaqs,
  speakers, setSpeakers,
  resources, setResources
}: Props) {

  const isHackathon = eventType === 'Hackathon';
  const isMUN = eventType === 'MUN';
  const isWorkshop = eventType === 'Workshop';

  // Generic helper for adding/removing items from lists
  const removeItem = <T,>(list: T[], setList: (v: T[]) => void, index: number) => {
    const next = [...list];
    next.splice(index, 1);
    setList(next);
  };
  
  const addItem = <T,>(list: T[], setList: (v: T[]) => void, item: T) => {
    setList([...list, item]);
  };

  const updateItem = <T,>(list: T[], setList: (v: T[]) => void, index: number, key: keyof T, value: string) => {
    const next = [...list];
    next[index] = { ...next[index], [key]: value };
    setList(next);
  };

  return (
    <div className="space-y-6">
      
      {/* Schedule */}
      <Card>
        <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                 <Calendar className="w-4 h-4 text-purple-600" />
                 <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Detailed Schedule</h2>
              </div>
              <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Format: YYYY-MM-DDTHH:MM | Title | Description (one per line)
                  </p>
                  <Textarea
                    value={scheduleText}
                    onChange={(e) => setScheduleText(e.target.value)}
                    rows={5}
                    placeholder="2025-03-15T09:00 | Opening Ceremony | Welcome address&#10;2025-03-15T10:00 | Event Kickoff | Rules and guidelines"
                    className="font-mono text-sm bg-card/50"
                  />
              </div>
        </CardContent>
      </Card>

      {/* Teams & Roles (Hidden for Hackathons if requested, but shown generally. For MUNs adding Committees) */}
      <Card>
        <CardContent className="pt-6 space-y-6">
             <div className="flex items-center gap-2 border-b border-border pb-2">
                 <Users className="w-4 h-4 text-purple-600" />
                 <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">People & Roles</h2>
              </div>

            <div className="grid md:grid-cols-2 gap-6">
                {!isHackathon && (
                  <div className="space-y-3">
                    <Label>Event Teams</Label>
                    <p className="text-xs text-muted-foreground">
                      Format: Name | Description | Email
                    </p>
                    <Textarea
                      value={teamsText}
                      onChange={(e) => setTeamsText(e.target.value)}
                      rows={4}
                      placeholder="Organizers | Main event team | contact@example.com"
                      className="font-mono text-sm bg-card/50"
                    />
                  </div>
                )}
                
                {/* MUN: Committees */}
                {isMUN && committeesText !== undefined && setCommitteesText && (
                  <div className="space-y-3">
                    <Label>Committees</Label>
                    <p className="text-xs text-muted-foreground">
                      Format: Committee Name | Agenda | Difficulty
                    </p>
                    <Textarea
                        value={committeesText}
                        onChange={(e) => setCommitteesText(e.target.value)}
                        rows={4}
                        placeholder="UNSC | Cyberwarfare | High&#10;DISEC | Small Arms | Medium"
                        className="font-mono text-sm bg-card/50"
                      />
                  </div>
                )}

                {/* Roles: Relevant for all, but maybe less for Workshops? Keeping generic */ }
                {rolesText !== undefined && setRolesText && (
                  <div className="space-y-3">
                    <Label>Participant Roles</Label>
                    <p className="text-xs text-muted-foreground">
                      Format: Role Name | Capacity (opt)
                    </p>
                    <Textarea
                        value={rolesText}
                        onChange={(e) => setRolesText(e.target.value)}
                        rows={4}
                        placeholder="Participant | 200&#10;Volunteer | 50&#10;Judge | 10"
                        className="font-mono text-sm bg-card/50"
                      />
                  </div>
                )}
            </div>
            
            {/* Speakers List - Prominent for Workshops */}
            {speakers && setSpeakers && (
              <div className="space-y-3 pt-4 border-t border-border/50">
                 <div className="flex items-center justify-between">
                    <Label className={isWorkshop ? "text-purple-600 font-bold" : ""}>
                       Speakers / Guests {isWorkshop && "(Required)"}
                    </Label>
                    <Button 
                      size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => addItem(speakers, setSpeakers, { id: crypto.randomUUID(), name: '', role: '' })}
                    >
                      <Plus className="w-3 h-3 mr-1"/> Add Speaker
                    </Button>
                 </div>
                 
                 {speakers.length === 0 && <p className="text-xs text-muted-foreground italic">No speakers added.</p>}
                 
                 <div className="space-y-2">
                   {speakers.map((item, i) => (
                     <div key={item.id || i} className="flex gap-2">
                        <Input 
                          placeholder="Name" 
                          value={item.name} 
                          onChange={e => updateItem(speakers, setSpeakers, i, 'name', e.target.value)}
                          className="flex-1 h-9 bg-card/50"
                        />
                        <Input 
                          placeholder="Role/Title" 
                          value={item.role || ''} 
                          onChange={e => updateItem(speakers, setSpeakers, i, 'role', e.target.value)}
                          className="flex-1 h-9 bg-card/50"
                        />
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => removeItem(speakers, setSpeakers, i)} aria-label="Remove speaker">
                           <Trash2 className="w-4 h-4"/>
                        </Button>
                     </div>
                   ))}
                 </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Prizes */}
      {prizeText !== undefined && setPrizeText && (
         <Card>
            <CardContent className="pt-6 space-y-4">
               <div className="flex items-center gap-2 border-b border-border pb-2">
                 <Trophy className="w-4 h-4 text-purple-600" />
                 <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Prizes & Awards</h2>
              </div>
              <Textarea
                value={prizeText}
                onChange={(e) => setPrizeText(e.target.value)}
                rows={4}
                placeholder="1st Place: $5000 + Swag&#10;2nd Place: $2500"
                className="font-mono text-sm bg-card/50"
              />
            </CardContent>
         </Card>
      )}

      {/* FAQs & Resources */}
      <div className="grid md:grid-cols-2 gap-6">
          {/* Resources */}
          {resources && setResources && (
             <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                     <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-purple-600" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resources</h2>
                     </div>
                     <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => addItem(resources, setResources, {id: crypto.randomUUID(), title: '', link: ''})} aria-label="Add resource">
                        <Plus className="w-4 h-4"/>
                     </Button>
                  </div>
                  
                  <div className="space-y-3">
                     {resources.length === 0 && <p className="text-xs text-muted-foreground">Add links to docs, slides, etc.</p>}
                     {resources.map((res, i) => (
                        <div key={res.id || i} className="space-y-1 p-2 bg-muted/20 rounded">
                           <div className="flex gap-2">
                              <Input 
                                placeholder="Title" className="h-8 bg-card/50" 
                                value={res.title} onChange={e => updateItem(resources, setResources, i, 'title', e.target.value)}
                              />
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => removeItem(resources, setResources, i)} aria-label="Remove resource">
                                 <Trash2 className="w-3 h-3"/>
                              </Button>
                           </div>
                           <Input 
                              placeholder="URL (https://...)" className="h-8 bg-card/50 text-xs font-mono"
                              value={res.link || ''} onChange={e => updateItem(resources, setResources, i, 'link', e.target.value)}
                           />
                        </div>
                     ))}
                  </div>
                </CardContent>
             </Card>
          )}

           {/* FAQs */}
           {faqs && setFaqs && (
             <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                     <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-purple-600" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">FAQs</h2>
                     </div>
                     <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => addItem(faqs, setFaqs, {question: '', answer: ''})} aria-label="Add FAQ">
                        <Plus className="w-4 h-4"/>
                     </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                     {faqs.length === 0 && <p className="text-xs text-muted-foreground">Common questions.</p>}
                     {faqs.map((faq, i) => (
                        <div key={i} className="space-y-1 p-2 bg-muted/20 rounded relative group">
                           <Input 
                             placeholder="Q: What should I bring?" 
                             className="h-8 bg-card/50 font-medium"
                             value={faq.question}
                             onChange={e => updateItem(faqs, setFaqs, i, 'question', e.target.value)}
                           />
                           <Textarea 
                             placeholder="A: Just your laptop!" 
                             className="h-16 text-xs bg-card/50 resize-none"
                             value={faq.answer}
                             onChange={e => updateItem(faqs, setFaqs, i, 'answer', e.target.value)}
                           />
                           <button 
                             onClick={() => removeItem(faqs, setFaqs, i)}
                             className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                           >
                             <Trash2 className="w-3 h-3" />
                           </button>
                        </div>
                     ))}
                  </div>
                </CardContent>
             </Card>
          )}
      </div>

    </div>
  );
}
