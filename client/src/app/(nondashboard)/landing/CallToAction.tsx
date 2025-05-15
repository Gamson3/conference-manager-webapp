"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image"
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const CallToActionSection = () => {
  return (
    <section
      className="relative py-24 text-white"
    >
        <Image 
         src="/call-to-action.jpg"
         alt="ConferenceMaster Search Section Background"
         fill
         className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/90"></div>
        <motion.div 
         initial={{ opacity:0, y: 30 }}
         whileInView={{ opacity: 1, y:0 }}
         transition={{ duration: 0.5 }}
         viewport={{ once: true }}
         className="relative max-4xl xl:max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-12 z-10"
        >
            <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-6 md:mb-0 md:mr-10">
                    <h2 className="text-2xl sm:text-2xl font-bold mb-6">
                        Ready to manage your next big conference with ease?
                    </h2>
                </div>
                <div>
                    <p className="mb-8">
                        Join organizers around the world who are streamlining their conferences with our all-in-one platform.
                    </p>
                    <div className="flex justify-center md:justify-start gap-4">
                        <button
                         onClick={() => window.scrollTo({ top:0, behavior: "smooth" })}
                         className="inline-block text-white bg-transparent border rounded-lg px-6 py-3 font-semibold  hover:bg-white hover:text-primary-700 cursor-pointer" 
                        >
                            Search
                        </button>
                        <Link
                          href="/signup"
                          className="inline-block text-white bg-secondary-600 rounded-lg px-6 py-3 font-semibold hover:bg-white hover:text-primary-700"
                          scroll={false}
                        >
                          Get Started
                        </Link> 
                    </div>
                </div>  
            </div>
        </motion.div>
    </section>
  );
};

export default CallToActionSection;
