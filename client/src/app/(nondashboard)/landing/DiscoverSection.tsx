"use client";

import React from "react"
import { motion } from "framer-motion"
import Image from "next/image";

const containerVariants = {
    hidden: { opacity: 0},
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2, },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const DiscoverSection = () => {
  return (
    <motion.div 
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.8 }}
    variants={containerVariants}
    className="py-12 mb-16 bg-white"
    >
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
            <motion.div 
            variants={itemVariants}
            className="my-12 text-center "
            >
                <h2 className="text-3xl font-semibold leading-tight text-gray-800">Discover Powerful Conference Features</h2>
                <p className="mt-4 text-lg text-gray-600">
                    Designed for attendees, organizers, and all.
                </p>
                <p className="mt-2 text-gray-500 max-w-3xl mx-auto">
                    From searching presentations to managing schedules and uploading content, 
                    our platform offers robust features tailored to academic conferences. 
                    Whether you're an organizer or a participant, discover tools that simplify your experience. 
                    With our user-friendly search feature, you can quickly find the perfect
                    event that meets all your needs. Start your search today and discover
                    your life changing event!
                </p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 xl:gap-16">
                {[
                    {
                        imageSrc: "/landing-icon-wand.png",
                        title: "Organize Effortlessly",
                        description: "Create conferences, assign sessions, and invite authors—all in one place.",
                    },{
                        imageSrc: "/landing-icon-calendar.png",
                        title: "Navigate the Schedule",
                        description: "Explore sessions in a structured day/section/presentation layout.",
                    },{
                        imageSrc: "/landing-icon-heart.png",
                        title: "Save What You Love",
                        description: "Bookmark and revisit presentations with a single click.",
                    },
                ].map((card, index) => (
                    <motion.div key={index} variants={itemVariants}>
                        <DiscoverCard {...card} />
                    </motion.div>
                ))}
            </div>
        </div>

    </motion.div>
  )
}

const DiscoverCard = ({
    imageSrc,
    title,
    description,
}: {
    imageSrc: string;
    title: string;
    description: string;

}) => (
    <div className="py-12 px-4 text-center shadow-lg rounded-lg bg-primary-50 md:h-72">
        <div className="bg-primary-700 p-[0.6rem] rounded-full mb-4 h-10 w-10 mx-auto">
            <Image
            src={imageSrc}
            width={400}
            height={400}
            className="w-full h-full object-contain"
            alt={title}
            />
        </div>
        <h3 className="mt-4 text-xl font-medium text-gray-800">{title}</h3>
        <p className="mt-2 text-base text-gray-500">{description}</p>
        
    </div>
)

export default DiscoverSection;