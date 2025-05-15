"use client";

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link";
import Image from "next/image";

const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0, 
        transition: { duration: 0.5, staggerChildren: 0.2, },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const FeaturesSection = () => {
  return (
    <motion.div 
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={containerVariants}
    className="py-24 px-6 sm:px-8 lg:px-12 xl:px-16 bg-white"
    >
        <div className="max-w-4xl xl:max-w-6xl mx-auto">
            <motion.h2 
            variants={itemVariants}
            className="text-3xl font-bold text-center mb-12 w-full sm:w-2/3 mx-auto"
            >
                Everything you need to navigate, explore, and experience your conference — all in one place!
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 xl:gap-16">
                {[0,1,2].map((index) => (
                    <motion.div key={index} variants={itemVariants}>
                        <FeatureCard 
                            imageSrc={`/landing-search${3 - index}.png`}
                            title={
                                [
                                    "Explore Curated Sessions & Tracks",
                                    "Advanced Search & Filters",
                                    "Discover & Bookmark Favorites",
                                ][index]
                            }
                            description={
                                [
                                    "Dive into expertly organized tracks and sessions tailored to your interests — whether you're into AI, public health, or humanities.",
                                    "Easily search for sessions, speakers, institutions, or keywords. Our smart filters help you zero in on exactly what you want.",
                                    "Found something exciting? Save sessions, build your personal agenda, and uncover talks that align with your research.",
                                ][index]
                            }
                            linkText={["Explore", "Search", "Discover"][index]}
                            linkHref={["/Explore", "/Search", "/Discover"][index]}
                        />
                    </motion.div>
                ))}
            </div>
        </div>

    </motion.div>
  )
}

const FeatureCard = ({
    imageSrc,
    title,
    description,
    linkText,
    linkHref,
}: {
    imageSrc: string;
    title: string;
    description: string;
    linkText: string;
    linkHref: string;

}) => (
    <div className="text-center">
        <div className="p-4 rounded-lg mb-4 flex items-center justify h-48">
            <Image
            src={imageSrc}
            width={400}
            height={400}
            className="w-full h-full object-contain"
            alt={title}
            />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="mb-4">{description}</p>
        <Link 
         href={linkHref}
         className="inline-block border border-gray-300 rounded px-4 py-2 hover:bg-gray-100"
         scroll={false}
        >
        {linkText}
        </Link>
    </div>
)

export default FeaturesSection;