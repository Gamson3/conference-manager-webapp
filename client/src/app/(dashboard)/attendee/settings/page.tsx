"use client";

import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Icons
import { 
  Loader2, 
  UserCheck, 
  BellIcon, 
  SaveIcon, 
  UserIcon 
} from "lucide-react";

// Redux hooks - ADD THESE IMPORTS
import { useGetAuthUserQuery, useUpdateAttendeeProfileMutation } from "@/state/api";

// Form schemas
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().optional(),
  bio: z.string().optional(),
  organization: z.string().optional(),
  jobTitle: z.string().optional(),
  interests: z.string().optional(),
});

const notificationsFormSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  reminders: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export default function AttendeeSettings() {
  // Redux hooks with proper typing
  const { data: authUser, isLoading, error } = useGetAuthUserQuery();
  const [updateAttendeeProfile, { isLoading: isUpdating }] = useUpdateAttendeeProfileMutation();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      bio: "",
      organization: "",
      jobTitle: "",
      interests: "",
    },
  });

  // Notifications form
  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      reminders: true,
    },
  });

  // Data initialization - Update forms when user data is loaded
  React.useEffect(() => {
    if (authUser?.userInfo) {
      console.log('[DEBUG] Loading user data into forms:', authUser.userInfo);

      profileForm.reset({
        name: authUser.userInfo.name || "",
        email: authUser.userInfo.email || "",
        phoneNumber: authUser.userInfo.phoneNumber || "",
        bio: authUser.userInfo.bio || "",
        organization: authUser.userInfo.organization || "",
        jobTitle: authUser.userInfo.jobTitle || "",
        interests: authUser.userInfo.interests?.join(", ") || "",
      });

      // Handle preferences with fallback
      const preferences = authUser.userInfo.preferences || {};
      notificationsForm.reset({
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? true,
        marketingEmails: preferences.marketingEmails ?? false,
        reminders: preferences.reminders ?? true,
      });
    }
  }, [authUser, profileForm, notificationsForm]);

  // Handle profile update
  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      console.log('[DEBUG] Submitting profile data:', data);

      // Convert comma-separated interests to array
      const interestsArray = data.interests
        ? data.interests.split(",").map(i => i.trim()).filter(Boolean)
        : [];

      const updatePayload = {
        cognitoId: authUser?.cognitoInfo?.userId,
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber || null,
        bio: data.bio || null,
        organization: data.organization || null,
        jobTitle: data.jobTitle || null,
        interests: interestsArray.length > 0 ? interestsArray : null,
      };

      console.log('[DEBUG] Update payload:', updatePayload);

      await updateAttendeeProfile(updatePayload).unwrap();
      
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error?.data?.message || "Failed to update profile. Please try again.");
    }
  };

  // Handle notifications update
  const onNotificationsSubmit = async (data: NotificationsFormValues) => {
    try {
      await updateAttendeeProfile({
        cognitoId: authUser?.cognitoInfo?.userId,
        preferences: data,
      }).unwrap();
      
      toast.success("Notification preferences updated!");
    } catch (error: any) {
      console.error("Error updating notifications:", error);
      toast.error(error?.data?.message || "Failed to update notification preferences.");
    }
  };

  // Debug user data
  React.useEffect(() => {
    if (authUser) {
      console.log('[DEBUG] Auth user data:', {
        cognitoInfo: authUser.cognitoInfo,
        userInfo: authUser.userInfo,
        userRole: authUser.userRole
      });
    }
    if (error) {
      console.error('[DEBUG] Auth query error:', error);
    }
  }, [authUser, error]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load user data</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // No user data
  if (!authUser) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-muted-foreground">No user data available</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8 max-w-7xl mx-auto">
      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg text-xs">
          <details>
            <summary>Debug Info (Dev Only)</summary>
            <pre>{JSON.stringify({
              isLoading,
              isUpdating,
              hasAuthUser: !!authUser,
              userInfo: authUser?.userInfo,
              error: error,
              profileFormValues: profileForm.getValues(),
              notificationFormValues: notificationsForm.getValues()
            }, null, 2)}</pre>
          </details>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and set notification preferences.
          </p>
        </div>
        
        <Separator className="my-6" />
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* User Card */}
          <Card className="w-full md:w-80 h-fit bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
            <CardHeader className="pb-3">
              <div className="flex justify-center">
                <Avatar className="h-24 w-24 border-4 border-primary-200">
                  <AvatarImage src={authUser?.userInfo?.profileImage} alt={authUser?.userInfo?.name} />
                  <AvatarFallback className="bg-primary text-4xl font-bold">
                    {authUser?.userInfo?.name?.charAt(0) ? authUser.userInfo.name.charAt(0).toUpperCase() : <UserIcon />}
                  </AvatarFallback>
                </Avatar>
              </div>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <h3 className="text-xl font-semibold mb-1">{authUser?.userInfo?.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {authUser?.userInfo?.jobTitle}
                {authUser?.userInfo?.jobTitle && authUser?.userInfo?.organization ? " at " : ""}
                {authUser?.userInfo?.organization}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-lg font-semibold">{authUser?.userInfo?.attendedEvents || 0}</p>
                  <p className="text-xs text-muted-foreground">Events Attended</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-lg font-semibold">{authUser?.userInfo?.connections || 0}</p>
                  <p className="text-xs text-muted-foreground">Connections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <BellIcon className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
              </TabsList>
              
              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details visible to other event attendees.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="Your email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your phone number" {...field} />
                                </FormControl>
                                <FormDescription>
                                  This will only be shared with event organizers.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="organization"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organization</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your company or organization" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="jobTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your job title" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="interests"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Interests</FormLabel>
                                <FormControl>
                                  <Input placeholder="Technology, Design, etc." {...field} />
                                </FormControl>
                                <FormDescription>
                                  Separate multiple interests with commas.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={profileForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="A short bio about yourself"
                                  className="resize-none min-h-[120px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Tell others a bit about yourself, your interests and background.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end">
                          <Button 
                            type="submit"
                            disabled={isUpdating || !profileForm.formState.isDirty}
                            className="flex items-center gap-2"
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving Changes...
                              </>
                            ) : (
                              <>
                                <SaveIcon className="h-4 w-4" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Manage how you receive notifications about events and connections.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...notificationsForm}>
                      <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)} className="space-y-8">
                        <div className="space-y-4">
                          <FormField
                            control={notificationsForm.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Email Notifications</FormLabel>
                                  <FormDescription>
                                    Receive email notifications about your registered events.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={notificationsForm.control}
                            name="pushNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Push Notifications</FormLabel>
                                  <FormDescription>
                                    Receive push notifications when using the application.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={notificationsForm.control}
                            name="reminders"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Event Reminders</FormLabel>
                                  <FormDescription>
                                    Get reminders about upcoming events you've registered for.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={notificationsForm.control}
                            name="marketingEmails"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Marketing Emails</FormLabel>
                                  <FormDescription>
                                    Receive emails about similar events and promotions.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end">
                          <Button 
                            type="submit"
                            disabled={isUpdating || !notificationsForm.formState.isDirty}
                            className="flex items-center gap-2"
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving Changes...
                              </>
                            ) : (
                              <>
                                <SaveIcon className="h-4 w-4" />
                                Save Preferences
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </motion.div>
    </div>
  );
}