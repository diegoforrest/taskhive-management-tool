"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrivacyPolicyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
}

export function PrivacyPolicy({ open, onOpenChange, onAccept }: PrivacyPolicyProps) {
  const [canContinue, setCanContinue] = useState(false);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    // Check if user has scrolled to within 20px of the bottom
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
    setCanContinue(isAtBottom);
  };

  const handleAccept = () => {
    onAccept?.();
    onOpenChange(false);
  };

  // Reset scroll state when modal opens
  useEffect(() => {
    if (open) {
      setCanContinue(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Privacy Policy</DialogTitle>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-y-auto px-6 py-4"
          onScroll={handleScroll}
        >
          <div className="space-y-6 text-sm leading-relaxed">
            {/* Project Disclaimer */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">🚧 Demo Project Notice</h3>
              <p className="text-yellow-700">
                <strong>TaskHive is a demonstration project for educational and portfolio purposes only.</strong> 
                This application is not intended for production use or handling of real personal data. 
                Any information entered may not be permanently stored or protected to commercial standards.
              </p>
            </div>

            {/* Intellectual Property Disclaimer */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">📄 Third-Party Assets Disclaimer</h3>
              <p className="text-blue-700">
                Icons, logos, images, and other visual assets used in this application may be sourced from 
                third-party providers and remain the property of their respective owners. This includes but 
                is not limited to icons from Lucide React, images from Unsplash, and any branded elements. 
                No claim of ownership is made over these assets.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Information We Collect</h3>
              <p>
                For this demonstration project, we may collect:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Username, email address, and encrypted passwords for demo authentication</li>
                <li><strong>Project Data:</strong> Task information, project names, and user-generated content for demonstration purposes</li>
                <li><strong>Usage Information:</strong> Basic interaction data to showcase application functionality</li>
                <li><strong>Technical Data:</strong> Browser information, IP addresses, and device identifiers as typically logged by web applications</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">How We Use Your Information</h3>
              <p>
                Information collected in this demo application is used solely for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Demonstrating authentication and user management features</li>
                <li>Showcasing task and project management functionality</li>
                <li>Providing a realistic user experience for portfolio demonstration</li>
                <li>Basic application analytics and performance monitoring</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Data Storage and Security</h3>
              <div className="bg-orange-50 border border-orange-200 p-4 rounded">
                <p className="text-orange-800">
                  <strong>Important:</strong> As this is a demonstration project, data security measures 
                  may not meet production standards. Please do not enter sensitive personal information, 
                  real passwords, or confidential data.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2">
                <li>Data is stored in a local development database</li>
                <li>Passwords are encrypted using industry-standard hashing</li>
                <li>No payment information is collected or stored</li>
                <li>Data may be periodically reset for demonstration purposes</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Data Sharing and Third Parties</h3>
              <p>
                We do not sell, trade, or share your information with third parties, except:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>When required by law or legal process</li>
                <li>To protect the rights, property, or safety of the application or users</li>
                <li>For technical service providers assisting with application hosting (if applicable)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cookies and Local Storage</h3>
              <p>
                This application may use:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> For user authentication and session management</li>
                <li><strong>Local Storage:</strong> To remember user preferences and login information (if &quot;Remember Me&quot; is selected)</li>
                <li><strong>Analytics:</strong> Basic usage tracking for demonstration purposes</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Rights and Choices</h3>
              <p>
                Even in this demo environment, you have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access and review your account information</li>
                <li>Update or correct your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of any analytics or tracking features</li>
                <li>Clear your browser&apos;s local storage and cookies</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Children&apos;s Privacy</h3>
                <p>
                  This demonstration application is not intended for children under 13 years of age. 
                  We do not knowingly collect personal information from children under 13.
                </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Changes to Privacy Policy</h3>
              <p>
                As this is a demonstration project, this privacy policy may be updated to reflect 
                new features or changes in the application. Any significant changes will be 
                communicated through the application interface.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <p>
                For questions about this privacy policy or the demo application, please contact 
                the developer through the appropriate channels provided in the application documentation 
                or repository.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded mt-6">
              <p className="text-xs text-gray-600">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US')}<br />
                <strong>Application:</strong> TaskHive (Demo Project)<br />
                <strong>Status:</strong> Educational/Portfolio Demonstration Only
              </p>
            </div>

            {/* Bottom spacer to ensure full scroll */}
            <div className="h-8"></div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button
            onClick={handleAccept}
            disabled={!canContinue}
            className={`${
              canContinue 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canContinue ? 'Accept Privacy Policy' : 'Please scroll to bottom to continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
