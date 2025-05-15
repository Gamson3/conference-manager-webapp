"use client";

import SettingsForm from "@/components/SettingsForm";
import {
  useGetAuthUserQuery,
  useUpdateOrganizerSettingsMutation,
} from "@/state/api";
import React from "react";

const OrganizerSettings = () => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateOrganizer] = useUpdateOrganizerSettingsMutation();

  if (isLoading) return <>Loading...</>;

  const initialData = {
    name: authUser?.userInfo.name,
    email: authUser?.userInfo.email,
    phoneNumber: authUser?.userInfo.phoneNumber,
  };

  const handleSubmit = async (data: typeof initialData) => {
    await updateOrganizer({
      cognitoId: authUser?.cognitoInfo?.userId,
      ...data,
    });
  };

  return (
    <SettingsForm
      initialData={initialData}
      onSubmit={handleSubmit}
      userType="organizer"
    />
  );
};

export default OrganizerSettings;