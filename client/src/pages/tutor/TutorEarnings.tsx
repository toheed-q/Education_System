import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wallet, TrendingUp, Calendar, ArrowDownToLine, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TutorEarnings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const completedBookings = ((bookings as any[]) || []).filter(b => b.status === 'completed');
  const grossEarnings = completedBookings.reduce((sum, b) => sum + (b.pricePaid || b.price || 0), 0);
  const platformFee = Math.round(grossEarnings * 0.25);
  const availableForWithdrawal = grossEarnings - platformFee;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-earnings-title">Earnings</h1>
            <p className="text-muted-foreground">Track your tutoring income</p>
          </div>
          <Button
            disabled={availableForWithdrawal <= 0}
            onClick={() => setWithdrawDialogOpen(true)}
            data-testid="button-withdraw"
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Request Withdrawal
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Gross Earnings</CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" data-testid="icon-earnings-info" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px]">
                        <p className="text-xs">Gross earnings are subject to a standard platform management fee as outlined in the Tutor Terms.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-gross-earnings">KES {grossEarnings.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total earnings from completed sessions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available for Withdrawal</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-available-withdrawal">KES {availableForWithdrawal.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Amount you can withdraw</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
                <CardDescription>Your completed sessions and earnings</CardDescription>
              </CardHeader>
              <CardContent>
                {completedBookings.length > 0 ? (
                  <div className="space-y-3">
                    {completedBookings.map((booking: any) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                        data-testid={`row-earning-${booking.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium" data-testid={`text-student-name-${booking.id}`}>
                              {booking.student?.name || "Student"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.startTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" data-testid={`text-earning-amount-${booking.id}`}>
                            KES {(booking.pricePaid || booking.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Wallet className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No earnings yet</h3>
                    <p className="text-muted-foreground">Complete tutoring sessions to start earning</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Review your payout breakdown before requesting a withdrawal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gross Earnings</span>
              <span className="font-medium" data-testid="text-withdraw-gross">KES {grossEarnings.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Platform Management Fee (25%)</span>
              <span className="font-medium" data-testid="text-withdraw-fee">- KES {platformFee.toLocaleString()}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Net Payout</span>
                <span className="font-bold text-lg" data-testid="text-withdraw-net">KES {availableForWithdrawal.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              LernenTech applies a 25% platform management fee to gross earnings to cover student acquisition, payments, support, and platform operations.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)} data-testid="button-cancel-withdraw">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setWithdrawDialogOpen(false);
                toast({
                  title: "Withdrawal Requested",
                  description: `Your withdrawal of KES ${availableForWithdrawal.toLocaleString()} has been submitted for processing.`,
                });
              }}
              data-testid="button-confirm-withdraw"
            >
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
