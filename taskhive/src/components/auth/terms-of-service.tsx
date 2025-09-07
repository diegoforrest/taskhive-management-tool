"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface TermsOfServiceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccept?: () => void
}

export function TermsOfService({ open, onOpenChange, onAccept }: TermsOfServiceProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Terms of Service</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Please read these terms carefully before using TaskHive.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-lg mb-2">1. Project Disclaimer</h3>
              <p className="text-muted-foreground">
                <strong>Important:</strong> TaskHive is a demonstration project created for educational and portfolio purposes only. 
                This application is not intended for commercial use or production environments.
              </p>
              <p className="text-muted-foreground mt-2">
                All icons, logos, design elements, and third-party resources used in this project remain the property of their respective owners. 
                This project does not claim ownership of any copyrighted materials used for demonstration purposes.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">2. Acceptance of Terms</h3>
              <p className="text-muted-foreground">
                By accessing and using TaskHive, you acknowledge that you understand this is a demo project and agree to use it responsibly.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">3. User Accounts</h3>
              <p className="text-muted-foreground">
                You may create an account to test the application's features. Please do not use real sensitive information as this is a demonstration environment.
              </p>
              <p className="text-muted-foreground mt-2">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">4. Acceptable Use</h3>
              <p className="text-muted-foreground">
                You agree to use TaskHive only for its intended demonstration purposes. You may not:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Upload or transmit malicious code or content</li>
                <li>Attempt to gain unauthorized access to the system</li>
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>Interfere with or disrupt the service or servers</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">5. Content and Data</h3>
              <p className="text-muted-foreground">
                Any content you create or upload to TaskHive is for demonstration purposes only. The service may not guarantee data persistence or backup.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">6. Limitation of Liability</h3>
              <p className="text-muted-foreground">
                TaskHive is provided "as is" without any warranties. The creators are not liable for any damages arising from the use of this demonstration application.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">7. Intellectual Property</h3>
              <p className="text-muted-foreground">
                This project may include third-party components, icons, and design elements. All such materials remain the property of their respective copyright holders.
                The source code of this demonstration project may be available for educational purposes.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">8. Changes to Terms</h3>
              <p className="text-muted-foreground">
                These terms may be updated as the project evolves. Continued use constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">9. Contact</h3>
              <p className="text-muted-foreground">
                If you have questions about these terms or the project, please contact the project maintainer.
              </p>
            </section>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button 
            onClick={() => {
              onAccept?.()
              onOpenChange(false)
            }} 
            variant="default"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
