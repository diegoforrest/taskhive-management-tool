"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LandingPageContent() {
  return (
    <>
      <style jsx>{`
        /* Mobile First (default styles are for mobile) */
        .hero-container {
          padding-top: 15rem;
        }
        
        .logo-title-container {
          flex-direction: column;
        }
        
        .logo-image {
          width: 120px;
          height: 120px;
        }
        
        .main-title {
          font-size: 2.25rem;
          text-align: center;
        }
        
        .tagline {
          font-size: 1rem;
          margin-left: 0;
          margin-top: -1.25rem;
          text-align: center;
        }
        
        .buttons-container {
          flex-direction: column;
          margin-left: 0;
          max-width: 20rem;
        }
        
        .button-base {
          width: 100%;
          font-size: 0.875rem;
        }

        /* Small screens and up (640px+) */
        @media (min-width: 640px) {
          .hero-container {
            padding-top: 12rem;
          }
          
          .logo-title-container {
            flex-direction: row;
          }
          
          .main-title {
            font-size: 3.75rem;
            text-align: center;
          }
          
          .tagline {
            font-size: 1.875rem;
            margin-left: 0;
            text-align: center;
          }
          
          .buttons-container {
            flex-direction: row;
            margin-left: 0;
            max-width: 28rem;
          }
          
          .button-base {
            width: auto;
            font-size: 1rem;
          }
        }

        /* Medium screens and up (768px+) */
        @media (min-width: 768px) {
          .hero-container {
            padding-top: 10rem;
          }
        }

        /* Large screens and up (1024px+) */
        @media (min-width: 1024px) {
          .hero-container {
            padding-top: 18rem;
            margin: 0 auto;
          }
          .main-title {
          margin-left: -1rem;
          }

        }
      `}</style>
      
      <div className="min-h-screen bg-background">        
        <div className={`flex flex-col items-center justify-center h-auto px-4 sm:px-20 hero-container`}>
          {/* Logo & Title side by side */}
          <div className={`flex items-center justify-center max-w-full logo-title-container`}>
            <div className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="My Logo"
                width={120}
                height={120}
                className={`w-full rounded-lg logo-image`}
              />
            </div>
            <h1 className={`font-bold truncate max-w-full  main-title`}>
              taskHive
            </h1>
          </div>

          {/* Quote / Tagline */}
          <p className={`text-center pl-12 text-muted-foreground max-w-xl tagline`}>
            Stay productive, One task at a time.
          </p>

          {/* Buttons */}
          <div className={`flex gap-5 mt-4 pl-10 w-full justify-center buttons-container`}>
            <a
              href="/auth/sign-in"
              className={`rounded-full bg-foreground text-background font-semibold px-6 py-3 hover:bg-gray-800 transition-colors flex items-center justify-center button-base`}
            >
              Get Started
            </a>
            <a
              href="/learn-more"
              className={`rounded-full border border-foreground text-foreground font-semibold px-6 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center button-base`}
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect authenticated users to the task page
    if (!isLoading && isAuthenticated) {
      router.push('/task');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <LandingPageContent />;
  }

  // This shouldn't be reached due to the useEffect redirect, but just in case
  return null;
}