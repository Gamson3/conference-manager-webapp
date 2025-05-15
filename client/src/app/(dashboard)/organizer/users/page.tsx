"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const InviteUsersPage = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call API to invite user by email
    // Example: await inviteUserByEmail(email);
    setStatus("success");
    setEmail("");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Invite Users</h1>
      <form onSubmit={handleInvite} className="flex gap-4 mb-6">
        <Input
          type="email"
          placeholder="Enter user's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit">Send Invite</Button>
      </form>
      {status === "success" && (
        <p className="text-green-600">Invitation sent successfully!</p>
      )}
      {/* TODO: List invited users and their status */}
      <p>Invite attendees or co-organizers to your events by email. They will receive an invitation to join.</p>
    </div>
  );
};

export default InviteUsersPage;