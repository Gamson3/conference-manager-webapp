import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/*': ['./node_modules/**/*'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      // Canonicalize conference root to Home dashboard
      {
        source: "/organizer/conferences/:id",
        destination: "/organizer/conferences/:id/home",
        permanent: false,
      },

      // Legacy Setup -> Settings
      {
        source: "/organizer/conferences/:id/setup",
        destination: "/organizer/conferences/:id/settings/basics",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/setup/timeline",
        destination: "/organizer/conferences/:id/settings/deadlines",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/edit",
        destination: "/organizer/conferences/:id/settings/organizer-info",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/publish",
        destination: "/organizer/conferences/:id/settings/publish",
        permanent: false,
      },

      // Legacy Schedule -> Program
      {
        source: "/organizer/conferences/:id/schedule",
        destination: "/organizer/conferences/:id/program/overview",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/schedule/days",
        destination: "/organizer/conferences/:id/program/days",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/schedule/sections",
        destination: "/organizer/conferences/:id/program/sessions",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/schedule/builder",
        destination: "/organizer/conferences/:id/program/scheduler",
        permanent: false,
      },

      // Legacy Materials -> Website namespace
      {
        source: "/organizer/conferences/:id/materials",
        destination: "/organizer/conferences/:id/website/materials",
        permanent: false,
      },

      // Older Abstracts submission-form subtree -> submission-form-settings
      {
        source: "/organizer/conferences/:id/abstracts/submission-form",
        destination: "/organizer/conferences/:id/abstracts/submission-form-settings/general",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/abstracts/submission-form/questions",
        destination: "/organizer/conferences/:id/abstracts/submission-form-settings/additional-questions",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/abstracts/submission-form/dates-limits",
        destination: "/organizer/conferences/:id/abstracts/submission-form-settings/submission-dates-limits",
        permanent: false,
      },
      {
        source: "/organizer/conferences/:id/abstracts/submission-form/guidelines",
        destination: "/organizer/conferences/:id/abstracts/submission-form-settings/submission-guidelines",
        permanent: false,
      },

      // Legacy setup categories -> Abstracts topics-and-categories
      {
        source: "/organizer/conferences/:id/setup/categories",
        destination: "/organizer/conferences/:id/abstracts/topics-and-categories",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
