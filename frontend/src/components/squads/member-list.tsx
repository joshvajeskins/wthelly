"use client";

import { Card, CardContent } from "@/components/ui/card";
import { User, getStatusLabel } from "@/types";

interface MemberListProps {
  members: User[];
  leaderId: string;
  currentUserAddress?: string;
}

export function MemberList({ members, leaderId, currentUserAddress }: MemberListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isLeader = member.address === leaderId;
        const isCurrentUser = member.address === currentUserAddress;

        return (
          <Card
            key={member.address}
            className={`border-2 ${
              isCurrentUser ? "border-[#BFFF00]" : "border-border"
            }`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black lowercase text-foreground">
                      {member.username || member.address.slice(0, 8)}
                    </span>
                    {isLeader && (
                      <span className="text-xs text-[#BFFF00] font-bold lowercase">
                        leader
                      </span>
                    )}
                    {isCurrentUser && !isLeader && (
                      <span className="text-xs text-muted-foreground font-bold lowercase">
                        you
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground lowercase">
                    {getStatusLabel(member.status)}
                  </span>
                </div>
              </div>

              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-lg font-black text-[#BFFF00]">{member.rizz}</p>
                  <p className="text-xs text-muted-foreground lowercase">rizz</p>
                </div>
                <div>
                  <p className="text-lg font-black text-foreground">{member.aura}</p>
                  <p className="text-xs text-muted-foreground lowercase">aura</p>
                </div>
                <div>
                  <p className="text-lg font-black text-foreground">{member.winRate}%</p>
                  <p className="text-xs text-muted-foreground lowercase">wr</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
