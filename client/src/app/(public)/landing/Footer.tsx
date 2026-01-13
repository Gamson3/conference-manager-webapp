'use client';

import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebook,
  faInstagram,
  faTwitter,
  faLinkedin,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t bg-white">
      <div className="app-container py-12 md:py-16 grid gap-8 md:grid-cols-4 text-base">
        {/* Brand & Description */}
        <div>
          <h3 className="font-semibold mb-3">Conference Master</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Platform for end-to-end conference planning, submissions,
            scheduling, and engagement.
          </p>

          {/* Social Icons */}
          <div className="flex space-x-4 text-xl">
            <a
              href="#"
              aria-label="Facebook"
              className="hover:text-primary-600 transition-colors"
            >
              <FontAwesomeIcon icon={faFacebook} className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="hover:text-primary-600 transition-colors"
            >
              <FontAwesomeIcon icon={faInstagram} className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="Twitter"
              className="hover:text-primary-600 transition-colors"
            >
              <FontAwesomeIcon icon={faTwitter} className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              className="hover:text-primary-600 transition-colors"
            >
              <FontAwesomeIcon icon={faLinkedin} className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="YouTube"
              className="hover:text-primary-600 transition-colors"
            >
              <FontAwesomeIcon icon={faYoutube} className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Explore */}
        <div>
          <h4 className="font-medium mb-2">Explore</h4>
          <ul className="space-y-1">
            <li>
              <Link
                href="/conferences"
                className="hover:text-foreground text-muted-foreground"
              >
                Conferences
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="hover:text-foreground text-muted-foreground"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="hover:text-foreground text-muted-foreground"
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Account */}
        <div>
          <h4 className="font-medium mb-2">Account</h4>
          <ul className="space-y-1">
            <li>
              <Link
                href="/login"
                className="hover:text-foreground text-muted-foreground"
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                href="/register"
                className="hover:text-foreground text-muted-foreground"
              >
                Register
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-medium mb-2">Legal</h4>
          <ul className="space-y-1">
            <li>
              <Link
                href="/privacy"
                className="hover:text-foreground text-muted-foreground"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="hover:text-foreground text-muted-foreground"
              >
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Conference Master. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
