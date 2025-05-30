"use client";

import React, { useState } from "react";
import { useGetAuthUserQuery, useUpdateOrganizerSettingsMutation } from "@/state/api";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Bell, 
  Palette, 
  CheckCircle, 
  Upload, 
  Globe, 
  Calendar, 
  Settings as SettingsIcon, 
  Save
} from "lucide-react";

const OrganizerSettings = () => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateOrganizer, { isLoading: isUpdating }] = useUpdateOrganizerSettingsMutation();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Form states for different sections
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    bio: "",
    organization: "",
    position: ""
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    eventReminders: true,
    marketingEmails: false,
    newFeatures: true
  });
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    darkMode: false,
    compactMode: false,
    highContrast: false
  });
  
  // Initialize form data once authUser is loaded
  React.useEffect(() => {
    if (authUser?.userInfo) {
      setProfileForm({
        name: authUser.userInfo.name || "",
        email: authUser.userInfo.email || "",
        phoneNumber: authUser.userInfo.phoneNumber || "",
        bio: authUser.userInfo.bio || "",
        organization: authUser.userInfo.organization || "",
        position: authUser.userInfo.position || ""
      });
    }
  }, [authUser]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateOrganizer({
        cognitoId: authUser?.cognitoInfo?.userId,
        ...profileForm,
      });
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };
  
  const handleNotificationChange = (setting: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  const handleAppearanceChange = (setting: keyof typeof appearanceSettings) => {
    setAppearanceSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Notification preferences saved");
    // Implement the API call to save notification preferences
  };
  
  const handleAppearanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Appearance settings saved");
    // Implement the API call to save appearance settings
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Password updated successfully");
    // Implement the password change logic
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-64 mb-4" />
        
        <div className="flex space-x-4 mb-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account preferences and settings
        </p>
      </motion.div>
      
      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 w-full max-w-md">
          <TabsTrigger value="profile" className="flex-1">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>
        
        {/* Profile Settings */}
        <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <form onSubmit={handleProfileSubmit}>
              <Card className="mb-8 border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and public profile
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={authUser?.userInfo?.avatarUrl || ""} alt={authUser?.userInfo?.name || ""} />
                        <AvatarFallback className="text-xl">
                          {authUser?.userInfo?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        Upload
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Full Name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            id="name"
                            name="name"
                            value={profileForm.name}
                            onChange={handleProfileChange}
                            placeholder="Enter your full name"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={profileForm.email}
                            onChange={handleProfileChange}
                            placeholder="Enter your email"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="text-sm font-medium">
                          Phone Number
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            value={profileForm.phoneNumber}
                            onChange={handleProfileChange}
                            placeholder="Enter your phone number"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-sm font-medium">
                          Organization
                        </Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            id="organization"
                            name="organization"
                            value={profileForm.organization}
                            onChange={handleProfileChange}
                            placeholder="Your organization"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-medium">
                      Bio
                    </Label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      placeholder="Tell us about yourself"
                      className="w-full min-h-[100px] p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500">
                      This bio will appear on your public profile and in organizer listings.
                    </p>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between border-t bg-gray-50 p-6">
                  <p className="text-sm text-gray-500">Last updated on {new Date().toLocaleDateString()}</p>
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary-700 hover:text-white items-center shadow-gray-400 cursor-pointer"
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                    <Save className="ml-1 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </motion.div>
        </TabsContent>
        
        {/* Security Settings */}
        <TabsContent value="security">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="mb-8 border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your password and account security
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium">
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium">
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter your new password"
                    />
                    <p className="text-xs text-gray-500">
                      Password must be at least 8 characters and include a number and special character.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                    />
                  </div>
                  
                  <Button type="submit" className="bg-primary hover:bg-primary-700 mt-2">
                    Update Password
                  </Button>
                </form>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Advanced Security</h3>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Two-factor Authentication</h4>
                      <p className="text-sm text-gray-500">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline">Setup 2FA</Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Active Sessions</h4>
                      <p className="text-sm text-gray-500">
                        Manage your active login sessions
                      </p>
                    </div>
                    <Button variant="outline">Manage Sessions</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        {/* Notification Settings */}
        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <form onSubmit={handleNotificationSubmit}>
              <Card className="mb-8 border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose when and how you want to be notified
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Email Notifications</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Event Updates</h4>
                          <p className="text-sm text-gray-500">
                            Receive notifications about your created events
                          </p>
                        </div>
                        <Switch 
                          checked={notificationSettings.emailNotifications}
                          onCheckedChange={() => handleNotificationChange('emailNotifications')}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Event Reminders</h4>
                          <p className="text-sm text-gray-500">
                            Get reminders about upcoming events and deadlines
                          </p>
                        </div>
                        <Switch 
                          checked={notificationSettings.eventReminders}
                          onCheckedChange={() => handleNotificationChange('eventReminders')}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Marketing Emails</h4>
                          <p className="text-sm text-gray-500">
                            Receive promotional content and special offers
                          </p>
                        </div>
                        <Switch 
                          checked={notificationSettings.marketingEmails}
                          onCheckedChange={() => handleNotificationChange('marketingEmails')}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">New Features</h4>
                          <p className="text-sm text-gray-500">
                            Stay updated on new platform features and improvements
                          </p>
                        </div>
                        <Switch 
                          checked={notificationSettings.newFeatures}
                          onCheckedChange={() => handleNotificationChange('newFeatures')}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Schedule</h3>
                    <p className="text-sm text-gray-500">
                      Choose when you'd like to receive digest emails
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="digestFrequency" className="text-sm font-medium">
                          Digest Frequency
                        </Label>
                        <select
                          id="digestFrequency"
                          className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="never">Never</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-sm font-medium">
                          Preferred Time
                        </Label>
                        <select
                          id="timezone"
                          className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="morning">Morning (8:00 AM)</option>
                          <option value="afternoon">Afternoon (2:00 PM)</option>
                          <option value="evening">Evening (6:00 PM)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-end border-t bg-gray-50 p-6">
                  <Button type="submit" className="bg-primary hover:bg-primary-700">
                    Save Preferences
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </motion.div>
        </TabsContent>
        
        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <form onSubmit={handleAppearanceSubmit}>
              <Card className="mb-8 border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize how the dashboard looks and feels
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Theme Preferences</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Dark Mode</h4>
                          <p className="text-sm text-gray-500">
                            Switch between light and dark theme
                          </p>
                        </div>
                        <Switch 
                          checked={appearanceSettings.darkMode}
                          onCheckedChange={() => handleAppearanceChange('darkMode')}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Compact Mode</h4>
                          <p className="text-sm text-gray-500">
                            Reduce spacing to show more content
                          </p>
                        </div>
                        <Switch 
                          checked={appearanceSettings.compactMode}
                          onCheckedChange={() => handleAppearanceChange('compactMode')}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">High Contrast</h4>
                          <p className="text-sm text-gray-500">
                            Increase contrast for better accessibility
                          </p>
                        </div>
                        <Switch 
                          checked={appearanceSettings.highContrast}
                          onCheckedChange={() => handleAppearanceChange('highContrast')}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Default View Settings</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="defaultPage" className="text-sm font-medium">
                          Default Landing Page
                        </Label>
                        <select
                          id="defaultPage"
                          className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="dashboard">Dashboard</option>
                          <option value="events">Events</option>
                          <option value="analytics">Analytics</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="calendarView" className="text-sm font-medium">
                          Default Calendar View
                        </Label>
                        <select
                          id="calendarView"
                          className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="month">Month</option>
                          <option value="week">Week</option>
                          <option value="day">Day</option>
                          <option value="list">List</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-end border-t bg-gray-50 p-6">
                  <Button type="submit" className="bg-primary hover:bg-primary-700">
                    Save Appearance
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </motion.div>
        </TabsContent>
      </Tabs>
      
      {/* Additional Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-gray-50 border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-50 text-primary rounded-full">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Need help with your settings?</h3>
                <p className="text-sm text-gray-500">
                  Visit our <a href="#" className="text-primary hover:underline">help center</a> or 
                  contact <a href="#" className="text-primary hover:underline">support</a> if you have any questions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrganizerSettings;