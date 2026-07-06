import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Plus, Search, Edit, Trash2, 
  Shield, UserCheck, Mail, Phone, Calendar, 
  ChevronLeft, ChevronRight,
  UserPlus, UserCog, ShieldAlert, CheckCircle, XCircle,
  Key, Building2, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
});

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  role?: string;
}

function AdminCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('user');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers]);

  const checkAdminAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }

    // Check if user is admin using the has_role function
    const { data: isAdminUser } = await supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });

    if (!isAdminUser) {
      navigate({ to: "/dashboard" });
      return;
    }

    setIsAdmin(true);
    loadCustomers();
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // Load customers from the customers table
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (customersError) throw customersError;

      // Load user roles for these customers
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("*");

      // Merge roles with customers
      const customersWithRoles = (customersData || []).map(customer => ({
        ...customer,
        role: rolesData?.find(r => r.user_id === customer.owner_id)?.role || 'user'
      }));

      setCustomers(customersWithRoles);
      setFilteredCustomers(customersWithRoles);
      
    } catch (error: any) {
      console.error("Error loading customers:", error);
      toast.error(error.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];
    
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  };

  const updateCustomerRole = async () => {
    if (!selectedCustomer) return;
    
    setLoading(true);
    try {
      // First, delete existing role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedCustomer.owner_id);
      
      // Then insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedCustomer.owner_id,
          role: selectedRole,
        });
      
      if (error) throw error;
      
      toast.success(`Customer role updated to ${selectedRole}`);
      setShowRoleModal(false);
      loadCustomers();
      
    } catch (error: any) {
      console.error("Role update error:", error);
      toast.error(error.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async () => {
    if (!selectedCustomer) return;
    
    setLoading(true);
    try {
      // Delete from user_roles first
      await supabase.from("user_roles").delete().eq("user_id", selectedCustomer.owner_id);
      
      // Then delete from customers
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", selectedCustomer.id);
      
      if (error) throw error;
      
      toast.success("Customer deleted successfully");
      setShowDeleteModal(false);
      loadCustomers();
      
    } catch (error: any) {
      toast.error(error.message || "Failed to delete customer");
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!email) {
      toast.error("No email address found for this customer");
      return;
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return { label: "Administrator", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Shield };
    }
    return { label: "Customer", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: UserCheck };
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

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

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">Customer Management</h1>
              <p className="text-blue-100 mt-2">Manage your customers and their information</p>
            </div>
            <button
              onClick={() => navigate({ to: "/admin/customers/new" })}
              className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur text-white font-semibold hover:bg-white/30 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Add Customer
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-blue-100 text-sm">Total Customers</p>
              <p className="text-2xl font-bold text-white">{customers.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-blue-100 text-sm">With Email</p>
              <p className="text-2xl font-bold text-green-300">{customers.filter(c => c.email).length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-blue-100 text-sm">With Company</p>
              <p className="text-2xl font-bold text-purple-300">{customers.filter(c => c.company).length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-blue-100 text-sm">Admins</p>
              <p className="text-2xl font-bold text-yellow-300">{customers.filter(c => c.role === 'admin').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={loadCustomers}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Company</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Joined</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                   </td>
                 </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No customers found
                   </td>
                 </tr>
              ) : (
                currentItems.map((customer, index) => {
                  const role = getRoleBadge(customer.role || 'user');
                  const RoleIcon = role.icon;
                  
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {customer.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{customer.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">ID: {customer.id.slice(0, 8)}</p>
                          </div>
                        </div>
                       </td>
                      <td className="px-6 py-4">
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="w-3 h-3" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <Phone className="w-3 h-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                       </td>
                      <td className="px-6 py-4">
                        {customer.company ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white">{customer.company}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                       </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${role.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {role.label}
                        </span>
                       </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {new Date(customer.created_at).toLocaleDateString()}
                       </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setSelectedRole(customer.role === 'admin' ? 'admin' : 'user');
                              setShowRoleModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Change Role"
                          >
                            <UserCog className="w-4 h-4 text-purple-500" />
                          </button>
                          <button
                            onClick={() => sendPasswordReset(customer.email)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Reset Password"
                            disabled={!customer.email}
                          >
                            <Key className="w-4 h-4 text-yellow-500" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                       </td>
                    </tr>
                  );
                })
              )}
            </tbody>
           </table>
        </div>

        {/* Pagination */}
        {filteredCustomers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} customers
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = currentPage;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Role Modal */}
      <AnimatePresence>
        {showRoleModal && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRoleModal(false)}></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change User Role</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Update role for {selectedCustomer.name || selectedCustomer.email}</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-blue-500">
                      <input
                        type="radio"
                        name="role"
                        value="user"
                        checked={selectedRole === 'user'}
                        onChange={(e) => setSelectedRole(e.target.value as 'user')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">Customer</p>
                        <p className="text-sm text-gray-500">Standard user with customer privileges</p>
                      </div>
                      <UserCheck className="w-5 h-5 text-blue-500" />
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-purple-500">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={selectedRole === 'admin'}
                        onChange={(e) => setSelectedRole(e.target.value as 'admin')}
                        className="w-4 h-4 text-purple-600"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">Administrator</p>
                        <p className="text-sm text-gray-500">Full access to all features</p>
                      </div>
                      <Shield className="w-5 h-5 text-purple-500" />
                    </label>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  <button
                    onClick={updateCustomerRole}
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Update Role
                  </button>
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Customer Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Customer</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">This action cannot be undone</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 dark:text-gray-300">
                    Are you sure you want to delete <span className="font-semibold">{selectedCustomer.name || selectedCustomer.email}</span>?
                    All associated data will be permanently removed.
                  </p>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  <button
                    onClick={deleteCustomer}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete Customer
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors"
                  >
                    Cancel
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