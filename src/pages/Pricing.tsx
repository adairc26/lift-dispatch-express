import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Clock, Info } from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Pricing & How It Works</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Transparent pricing for crane lifts and box truck deliveries
          </p>

          {/* Pricing Overview */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-primary" />
                  Crane Lift Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Base Rate</span>
                  <span className="font-semibold">CAD $250</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Per Kilometer</span>
                  <span className="font-semibold">CAD $3.50/km</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Per Hour</span>
                  <span className="font-semibold">CAD $175/hr</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Deposit Required</span>
                  <span className="font-semibold">30%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-primary" />
                  Box Truck Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Base Rate</span>
                  <span className="font-semibold">CAD $120</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Per Kilometer</span>
                  <span className="font-semibold">CAD $2.50/km</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Per Hour</span>
                  <span className="font-semibold">CAD $85/hr</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Deposit Required</span>
                  <span className="font-semibold">30%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How Estimates Work */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                How Estimates Are Calculated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Distance-Based Pricing</h3>
                <p className="text-muted-foreground">
                  We calculate the distance between your pickup and dropoff locations using Google Maps. 
                  The distance is multiplied by the per-kilometer rate for your service type.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Estimated Duration</h3>
                <p className="text-muted-foreground">
                  Based on the distance and service type, we estimate the job duration. 
                  This is multiplied by the hourly rate to give you a complete estimate.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Final Price</h3>
                <p className="text-muted-foreground">
                  Your final price is: <strong>Base Rate + (Distance × Per-km Rate) + (Duration × Hourly Rate)</strong>
                </p>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Info className="mr-2 h-4 w-4" />
                  Example Calculation
                </h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Crane Service</strong>: 20km distance, 2-hour job<br />
                  CAD $250 (base) + (20 × $3.50) + (2 × $175) = <strong>CAD $670 total</strong><br />
                  Deposit required: <strong>CAD $201</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Safety & Requirements */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" />
                Safety Requirements & Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Before Your Job</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Upload photos of items to be lifted/moved</li>
                  <li>Provide accurate weight estimates</li>
                  <li>Clear access to pickup and dropoff locations</li>
                  <li>Notify us of any overhead wires or obstructions</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">High-Value Jobs (Over CAD $2,000)</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Phone verification required</li>
                  <li>Dispatcher review before confirmation</li>
                  <li>Additional safety assessment may be needed</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Confirmation Timeline</h3>
                <p className="text-muted-foreground">
                  Standard bookings: Confirmed within <strong>2 business hours</strong><br />
                  You'll receive SMS and email updates at every stage
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" onClick={() => navigate('/book')}>
              Get Your Instant Estimate
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              All prices in CAD. Serving Vancouver & Lower Mainland, BC
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;