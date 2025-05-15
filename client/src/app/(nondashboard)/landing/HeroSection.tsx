"use client"; //Note whenever we use motion we need the client component

import Image from 'next/image';
import React from 'react'
import { motion } from "framer-motion"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <div className='relative h-screen'>
        <Image 
        src='/landing-conference.png'
        alt='ConferenceMaster Hero Section'
        fill
        className='object-cover object-center'
        priority
        />
        <div className="absolute inset-0 bg-blue bg-opacity-10
"></div>
        <div>
            <motion.div
            initial={{opacity:0, y:20}}
            animate={{opacity:1, y:0}}
            transition={{duration:0.8}}
            className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full'
            >
                <div className='max-w-4xl mx-auto px-16 sm:px-12'>
                    <h1 className='text-5xl font-bold text-white mb-4'>Conference solutions that make your participants and you happy! </h1>
                </div>
                <p className='text-xl text-white mb-8'>
                  Explore our wide range of conference solutions that fit your conference needs!
                </p>

                <div className="flex justify-center">
                  <Input
                    type="text"
                    value= "search query"
                    onChange= {() => {}}
                    placeholder="Discover the world's top conferences"
                    className="w-full max-w-lg rounded-none rounded-l-xl border-none bg-white h-12 "
                  />
                  <Button
                    onClick= {() => {}}
                    className= "bg-secondary-500 text-white rounded-none rounded-r-xl border-none hover:bg-secondary-600 h-12"
                  >
                    Search
                  </Button>
                </div>
            </motion.div>
        </div>
    </div>
  )
}

export default HeroSection;