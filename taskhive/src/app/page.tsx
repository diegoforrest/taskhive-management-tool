"use client";

import Image from "next/image";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LandingPageContent() {
  return (
    <>
      <style jsx>{`
        /* Mobile first (default styles are for mobile) */
        :global(html), :global(body) {
          height: auto;
          overflow: auto;
        }

        .hero-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-top: 0;
        }

        .logo-title-container {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0;
          margin-left: -1.5rem;
        }

        .logo-image {
          width: 48px;
          height: 48px;
          margin-right: 0.5rem;
        }

        .main-title {
          font-size: 2rem;
          text-align: left;
          margin: 0;
          margin-left: -1.1rem;
        }

        .tagline {
          font-size: 1rem;
          margin-left: 0;
          margin-top: -1.25rem;
          text-align: center;
        }

        .buttons-container {
          display: flex;
          flex-direction: column;
          margin-left: 0;
          max-width: 15rem;
          gap: 0.75rem;
        }

        .button-base {
          width: 100%;
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
        }

        /* Small screens and up (640px+) */
        @media (min-width: 640px) {
          .logo-title-container {
            margin-left: -2.5rem;
          }
          .logo-image {
            width: 64px;
            height: 64px;
          }
          .main-title {
            font-size: 2.5rem;
            margin-left: -0.5rem;
          }
          .tagline {
            font-size: 1.5rem;
            margin-left: 0;
            text-align: center;
          }
          .buttons-container {
            flex-direction: row;
            margin-left: 0;
            max-width: 28rem;
            gap: 1rem;
          }
          .button-base {
            width: auto;
            font-size: 1rem;
            padding: 0.625rem 1.25rem;
          }
        }

        /* Medium screens and up (768px+) */
        @media (min-width: 768px) {
          .logo-image {
            width: 80px;
            height: 80px;
          }
          .main-title {
            font-size: 3rem;
            margin-left: -0.7rem;
          }
        }

        /* Large screens and up (1024px+) */
        @media (min-width: 1024px) {
          /* Prevent vertical scrolling on desktop and lock to viewport */
          :global(body) {
            overflow: hidden;
            height: 100vh;
          }
          .logo-image {
            width: 100px;
            height: 100px;
          }
          .main-title {
            font-size: 3.5rem;
            margin-left: -1rem;
          }
          .buttons-container {
            gap: 1.25rem;
            flex-wrap: nowrap;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-background">        
        <div className={`flex flex-col items-center justify-center h-auto px-4 sm:px-4 md:px-10 lg:px-0 hero-container`}>
          <div className={`flex items-center justify-start max-w-full logo-title-container`}>
            <Image
              src="/logo.png"
              alt="My Logo"
              width={100}
              height={100}
              className={`rounded-lg logo-image`}
            />
            <h1 className={`font-bold truncate max-w-full main-title`}>
              taskHive
            </h1>
          </div>

          {/* Quote / Tagline */}
          <p className={`text-center text-muted-foreground max-w-xl tagline`}>
            Stay productive, One task at a time.
          </p>

          {/* Buttons */}
          <div className={`flex gap-5 mt-4 w-full justify-center buttons-container`}>
            <a
              href="/auth/sign-in"
              className={`rounded-full bg-foreground text-background font-semibold px-6 py-3 hover:bg-gray-800 transition-colors flex items-center justify-center button-base`}
            >
              Get Started
            </a>
            <a
              href="/info"
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
    // Redirect authenticated users to the dashboard page
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
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
