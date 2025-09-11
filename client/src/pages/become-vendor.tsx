import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// ✅ Define validation rules using Zod
const vendorSchema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a valid phone number"),
  address: z.string().min(5, "Address is too short"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type VendorFormData = z.infer<typeof vendorSchema>;

export default function BecomeVendor() {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
  });

  // ✅ What happens when user submits
  const onSubmit = async (data: VendorFormData) => {
    console.log("Vendor registration data:", data);

    // Here you’d send data to backend: await apiRequest("POST", "/api/vendors", data);

    toast({
      title: "Application submitted!",
      description: "We’ll review your vendor application shortly.",
    });

    reset(); // clear form after submit
  };

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Become a Vendor</CardTitle>
          <p className="text-muted-foreground">
            Register your store and start selling on MarketPlace Pro.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Store Name */}
            <div>
              <Input placeholder="Store Name" {...register("storeName")} />
              {errors.storeName && (
                <p className="text-red-500 text-sm">
                  {errors.storeName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <Input type="email" placeholder="Email" {...register("email")} />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Input
                type="tel"
                placeholder="Phone Number"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm">{errors.phone.message}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <Input placeholder="Business Address" {...register("address")} />
              {errors.address && (
                <p className="text-red-500 text-sm">{errors.address.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <textarea
                placeholder="Brief description about your business..."
                className="w-full border rounded-md p-2"
                rows={4}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-red-500 text-sm">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
