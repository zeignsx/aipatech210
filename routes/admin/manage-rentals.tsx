import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Pencil, Trash2, Upload, Save, X, ShieldAlert, 
  Eye, EyeOff, Wrench, Search, Filter, RefreshCw,
  DollarSign, Tag, Package, AlertCircle, CheckCircle,
  ArrowUp, ArrowDown, Image as ImageIcon, Link as LinkIcon,
  Users, Calendar, Clock, MessageSquare, Check, XCircle,
  Mail, Phone, MapPin, CreditCard, TrendingUp
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/manage-rentals")({
  component: ManageRentals,
});

interface Rental {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  day_rate: number;
  active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

interface BookingRequest {
  id: string;
  full_name: string;
  company: string;
  email: string;
  phone: string;
  equipment: string;
  start_date: string;
  end_date: string;
  rental_days: number;
  total_amount: number;
  status: string;
  message: string;
  created_at: string;
  customer_user_id: string;
  admin_notes: string;
  approved_by: string;
  approved_at: string;
}

const emptyRental: Omit<Rental, "id" | "created_at" | "updated_at"> = {
  name: "",
  category: "General",
  description: "",
  image_url: "",
  day_rate: 0,
  active: true,
  position: 0,
};

function ManageRentals() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<Rental[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [formData, setFormData] = useState(emptyRental);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requestFilter, setRequestFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'equipment' | 'requests'>('equipment');
  const [adminNotes, setAdminNotes] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  useEffect(() => {
    filterRentals();
  }, [searchTerm, categoryFilter, statusFilter, rentals]);

  useEffect(() => {
    if (activeTab === 'requests') {
      loadBookingRequests();
    }
  }, [activeTab, requestFilter]);

  const checkAdminAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }

    const { data: isAdminUser } = await supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });

    if (!isAdminUser) {
      navigate({ to: "/dashboard" });
      return;
    }

    setIsAdmin(true);
    loadRentals();
    loadBookingRequests();
  };

  const loadRentals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load rentals");
    } else {
      setRentals(data || []);
      const uniqueCategories = [...new Set((data || []).map(r => r.category))];
      setCategories(uniqueCategories);
    }
    setLoading(false);
  };

  const loadBookingRequests = async () => {
    let query = supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (requestFilter !== "all") {
      query = query.eq("status", requestFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load bookings:", error);
    } else {
      setBookingRequests(data || []);
    }
  };

  const filterRentals = () => {
    let filtered = [...rentals];

    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(r => 
        statusFilter === "active" ? r.active : !r.active
      );
    }

    setFilteredRentals(filtered);
  };

  const openCreateModal = () => {
    setEditingRental(null);
    setFormData({
      ...emptyRental,
      position: rentals.length + 1
    });
    setShowModal(true);
  };

  const openEditModal = (rental: Rental) => {
    setEditingRental(rental);
    setFormData({
      name: rental.name,
      category: rental.category,
      description: rental.description || "",
      image_url: rental.image_url || "",
      day_rate: rental.day_rate,
      active: rental.active,
      position: rental.position,
    });
    setShowModal(true);
  };

  const openApprovalModal = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setAdminNotes("");
    setShowApprovalModal(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, WEBP, and GIF images are allowed');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `rentals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const saveRental = async () => {
    if (!formData.name.trim()) {
      toast.error("Rental name is required");
      return;
    }

    if (formData.day_rate < 0) {
      toast.error("Day rate cannot be negative");
      return;
    }

    setLoading(true);
    try {
      if (editingRental) {
        const { error } = await supabase
          .from("rentals")
          .update({
            name: formData.name,
            category: formData.category,
            description: formData.description || null,
            image_url: formData.image_url || null,
            day_rate: formData.day_rate,
            active: formData.active,
            position: formData.position,
          })
          .eq("id", editingRental.id);

        if (error) throw error;
        toast.success("Rental updated successfully");
      } else {
        const { error } = await supabase
          .from("rentals")
          .insert({
            name: formData.name,
            category: formData.category,
            description: formData.description || null,
            image_url: formData.image_url || null,
            day_rate: formData.day_rate,
            active: formData.active,
            position: formData.position,
          });

        if (error) throw error;
        toast.success("Rental added successfully");
      }

      setShowModal(false);
      loadRentals();
    } catch (error: any) {
      toast.error(error.message || "Failed to save rental");
    } finally {
      setLoading(false);
    }
  };

  const approveBooking = async (status: 'approved' | 'rejected') => {
    if (!selectedBooking) return;
    
    setApprovalLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const updateData: any = {
        status: status,
      };
      
      if (status === 'approved') {
        updateData.approved_by = user.user?.id;
        updateData.approved_at = new Date().toISOString();
      }
      
      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", selectedBooking.id);

      if (error) throw error;

      toast.success(`Booking ${status} successfully`);
      setShowApprovalModal(false);
      loadBookingRequests();
      
      // Refresh the list
      loadRentals();
    } catch (error: any) {
      toast.error(error.message || "Failed to update booking");
    } finally {
      setApprovalLoading(false);
    }
  };

  const deleteRental = async (rental: Rental) => {
    if (!confirm(`Are you sure you want to delete "${rental.name}"?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("rentals")
      .delete()
      .eq("id", rental.id);

    if (error) {
      toast.error("Failed to delete rental");
    } else {
      toast.success("Rental deleted successfully");
      loadRentals();
    }
    setLoading(false);
  };

  const toggleActive = async (rental: Rental) => {
    const { error } = await supabase
      .from("rentals")
      .update({ active: !rental.active })
      .eq("id", rental.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(rental.active ? "Rental hidden" : "Rental visible");
      loadRentals();
    }
  };

  const moveRental = async (rental: Rental, direction: 'up' | 'down') => {
    const currentIndex = rentals.findIndex(r => r.id === rental.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= rentals.length) return;

    const newPosition = rentals[newIndex].position;
    
    await supabase
      .from("rentals")
      .update({ position: rental.position })
      .eq("id", rentals[newIndex].id);
    
    await supabase
      .from("rentals")
      .update({ position: newPosition })
      .eq("id", rental.id);

    loadRentals();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return styles[status] || styles.pending;
  };

  const requestStats = {
    total: bookingRequests.length,
    pending: bookingRequests.filter(r => r.status === 'pending').length,
    approved: bookingRequests.filter(r => r.status === 'approved').length,
    completed: bookingRequests.filter(r => r.status === 'completed').length,
    rejected: bookingRequests.filter(r => r.status === 'rejected').length,
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Admin privileges required</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: rentals.length,
    active: rentals.filter(r => r.active).length,
    inactive: rentals.filter(r => !r.active).length,
    categories: categories.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rental Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage equipment and rental requests</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Equipment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'equipment'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Equipment ({stats.total})
          </div>
          {activeTab === 'equipment' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'requests'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Rental Requests
            {requestStats.pending > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {requestStats.pending}
              </span>
            )}
          </div>
          {activeTab === 'requests' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>
      </div>

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Equipment</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Equipment</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.active}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.categories}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Tag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Day Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    ${rentals.length ? Math.round(rentals.reduce((sum, r) => sum + r.day_rate, 0) / rentals.length) : 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
                  <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-4 py-2 rounded-xl capitalize transition-all ${
                  categoryFilter === "all"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                All Categories
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-xl capitalize transition-all ${
                    categoryFilter === cat
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-xl capitalize transition-all ${
                  statusFilter === "all"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  statusFilter === "active"
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  statusFilter === "inactive"
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Inactive
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>

          {/* Rentals Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRentals.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No equipment found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Add your first rental equipment to get started</p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Add Equipment
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRentals.map((rental, index) => (
                <motion.div
                  key={rental.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {rental.image_url ? (
                      <img
                        src={rental.image_url}
                        alt={rental.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {!rental.active && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-semibold">
                        Inactive
                      </div>
                    )}
                    {rental.active && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold">
                        Active
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {rental.category}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveRental(rental, 'up')}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveRental(rental, 'down')}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {rental.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {rental.description || "No description available"}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${rental.day_rate}
                        </span>
                        <span className="text-sm text-gray-500">/day</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(rental)}
                          className={`p-2 rounded-lg transition-colors ${
                            rental.active
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200"
                          }`}
                          title={rental.active ? "Hide" : "Show"}
                        >
                          {rental.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEditModal(rental)}
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRental(rental)}
                          className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Rental Requests Tab */}
      {activeTab === 'requests' && (
        <>
          {/* Request Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{requestStats.total}</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{requestStats.pending}</p>
                </div>
                <div className="p-2 rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{requestStats.approved}</p>
                </div>
                <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{requestStats.completed}</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{requestStats.rejected}</p>
                </div>
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Request Filters */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'completed', 'rejected'].map((filter) => (
              <button
                key={filter}
                onClick={() => setRequestFilter(filter)}
                className={`px-4 py-2 rounded-xl capitalize transition-all ${
                  requestFilter === filter
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {filter} ({filter === 'all' ? requestStats.total : requestStats[filter as keyof typeof requestStats]})
              </button>
            ))}
          </div>

          {/* Requests List */}
          {bookingRequests.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No rental requests</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Customer rental requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookingRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {request.equipment}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4" />
                            <span className="text-sm">{request.full_name}</span>
                          </div>
                          {request.company && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Building2 className="w-4 h-4" />
                              <span className="text-sm">{request.company}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span className="text-sm">{request.email}</span>
                          </div>
                          {request.phone && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Phone className="w-4 h-4" />
                              <span className="text-sm">{request.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">
                              {request.start_date} → {request.end_date}
                            </span>
                          </div>
                          {request.rental_days > 0 && (
                            <>
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">{request.rental_days} days</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-sm font-semibold">Total: ${request.total_amount?.toLocaleString() || 0}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {request.message && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{request.message}</p>
                        </div>
                      )}
                      
                      {request.admin_notes && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Admin Notes:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{request.admin_notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openApprovalModal(request)}
                            className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Review & Approve
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <button
                          onClick={async () => {
                            const { error } = await supabase
                              .from("bookings")
                              .update({ status: 'completed' })
                              .eq("id", request.id);
                            if (!error) {
                              toast.success("Booking marked as completed");
                              loadBookingRequests();
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Equipment Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
            
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {editingRental ? "Edit Equipment" : "Add New Equipment"}
                    </h2>
                    <button
                      onClick={() => setShowModal(false)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Equipment Image
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        {formData.image_url ? (
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          {uploading ? "Uploading..." : "Upload Image"}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">or paste image URL below</p>
                        <input
                          type="text"
                          placeholder="https://example.com/image.jpg"
                          value={formData.image_url || ""}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          className="mt-2 w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Equipment Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Industrial Air Compressor"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Compressors, Pumps, Power"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the equipment..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Day Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Day Rate ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={formData.day_rate}
                        onChange={(e) => setFormData({ ...formData, day_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Position */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Display Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active (visible on website)
                    </label>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl flex gap-3">
                  <button
                    onClick={saveRental}
                    disabled={loading}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? "Saving..." : editingRental ? "Update Equipment" : "Add Equipment"}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowApprovalModal(false)}></div>
            
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Review Rental Request
                    </h2>
                    <button
                      onClick={() => setShowApprovalModal(false)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Request Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Equipment:</span>
                        <span className="font-medium">{selectedBooking.equipment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Customer:</span>
                        <span>{selectedBooking.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span>{selectedBooking.email}</span>
                      </div>
                      {selectedBooking.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone:</span>
                          <span>{selectedBooking.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Period:</span>
                        <span>{selectedBooking.start_date} → {selectedBooking.end_date}</span>
                      </div>
                      {selectedBooking.rental_days > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Amount:</span>
                          <span className="font-bold text-green-600">${selectedBooking.total_amount?.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedBooking.message && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedBooking.message}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add any notes for the customer..."
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  <button
                    onClick={() => approveBooking('approved')}
                    disabled={approvalLoading}
                    className="flex-1 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Approve Request
                  </button>
                  <button
                    onClick={() => approveBooking('rejected')}
                    disabled={approvalLoading}
                    className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Request
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}