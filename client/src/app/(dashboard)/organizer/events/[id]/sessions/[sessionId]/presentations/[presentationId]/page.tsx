// "use client";

// import { useState, useEffect } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Skeleton } from "@/components/ui/skeleton";
// import { Separator } from "@/components/ui/separator";
// import { 
//   ArrowLeft, Edit, Trash, Clock, Users, FileText, 
//   Download, Calendar, Tag
// } from "lucide-react";
// import { createAuthenticatedApi } from "@/lib/utils";
// import { toast } from "sonner";
// import { format } from "date-fns";

// export default function PresentationDetailPage() {
//   const params = useParams();
//   const router = useRouter();
//   const { id: eventId, sessionId, presentationId } = params;

//   const [presentation, setPresentation] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchPresentation = async () => {
//       try {
//         const api = await createAuthenticatedApi();
        
//         // Get presentation details from the presentations list
//         const response = await api.get(`/sections/${sessionId}/presentations`);
//         const presentations = response.data;
//         const currentPresentation = presentations.find((p: any) => p.id === Number(presentationId));
        
//         if (!currentPresentation) {
//           throw new Error("Presentation not found");
//         }
        
//         setPresentation(currentPresentation);
//       } catch (error: any) {
//         console.error("Error fetching presentation:", error);
//         toast.error("Failed to load presentation details");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (presentationId) {
//       fetchPresentation();
//     }
//   }, [sessionId, presentationId]);

//   const handleEdit = () => {
//     // Navigate to presentations management page with edit mode
//     router.push(`/organizer/events/${eventId}/sessions/${sessionId}/presentations?edit=${presentationId}`);
//   };

//   const handleDelete = async () => {
//     if (!confirm("Are you sure you want to delete this presentation? This action cannot be undone.")) {
//       return;
//     }

//     try {
//       const api = await createAuthenticatedApi();
//       await api.delete(`/api/presentations/${presentationId}`);
//       toast.success("Presentation deleted successfully");
//       router.push(`/organizer/events/${eventId}/sessions/${sessionId}`);
//     } catch (error: any) {
//       console.error("Error deleting presentation:", error);
//       toast.error(error.response?.data?.message || "Failed to delete presentation");
//     }
//   };

//   const formatDate = (dateString: string) => {
//     if (!dateString) return "Unknown";
//     return format(new Date(dateString), "MMM d, yyyy h:mm a");
//   };

//   if (loading) {
//     return (
//       <div className="p-8 max-w-4xl mx-auto">
//         <div className="flex items-center mb-6">
//           <Skeleton className="h-8 w-32" />
//         </div>
//         <Skeleton className="h-12 w-64 mb-8" />
//         <div className="space-y-6">
//           <Skeleton className="h-40" />
//           <Skeleton className="h-32" />
//           <Skeleton className="h-24" />
//         </div>
//       </div>
//     );
//   }

//   if (!presentation) {
//     return (
//       <div className="p-8 max-w-4xl mx-auto text-center">
//         <div className="bg-red-50 text-red-500 p-6 rounded-lg">
//           <h1 className="text-2xl font-bold mb-2">Presentation Not Found</h1>
//           <p className="mb-4">The presentation you're looking for could not be found.</p>
//           <Button 
//             onClick={() => router.push(`/organizer/events/${eventId}/sessions/${sessionId}`)}
//             variant="outline"
//           >
//             <ArrowLeft className="h-4 w-4 mr-2" />
//             Back to Session
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-8 max-w-4xl mx-auto">
//       {/* Breadcrumb Navigation */}
//       <div className="flex flex-wrap items-center mb-6">
//         <Button 
//           variant="ghost" 
//           className="p-0 h-8 hover:bg-transparent hover:text-primary" 
//           onClick={() => router.push("/organizer/events")}
//         >
//           <ArrowLeft className="h-4 w-4 mr-1" />
//           <span className="text-sm font-medium">Events</span>
//         </Button>
//         <span className="text-gray-400 mx-2">/</span>
//         <Button 
//           variant="ghost" 
//           className="p-0 h-8 hover:bg-transparent hover:text-primary" 
//           onClick={() => router.push(`/organizer/events/${eventId}/sessions`)}
//         >
//           <span className="text-sm font-medium">Sessions</span>
//         </Button>
//         <span className="text-gray-400 mx-2">/</span>
//         <Button 
//           variant="ghost" 
//           className="p-0 h-8 hover:bg-transparent hover:text-primary" 
//           onClick={() => router.push(`/organizer/events/${eventId}/sessions/${sessionId}`)}
//         >
//           <span className="text-sm font-medium">Session Details</span>
//         </Button>
//         <span className="text-gray-400 mx-2">/</span>
//         <span className="text-sm font-medium truncate max-w-[200px]">
//           {presentation.title}
//         </span>
//       </div>

//       {/* Header */}
//       <div className="flex justify-between items-start mb-8">
//         <div>
//           <h1 className="text-2xl font-bold tracking-tight mb-2">
//             {presentation.title}
//           </h1>
//           <div className="flex items-center gap-2">
//             <Badge 
//               variant="outline" 
//               className={`capitalize ${
//                 presentation.status === 'scheduled' 
//                   ? 'bg-green-50 text-green-700 border-green-200'
//                   : presentation.status === 'submitted'
//                   ? 'bg-blue-50 text-blue-700 border-blue-200'
//                   : 'bg-gray-50 text-gray-700 border-gray-200'
//               }`}
//             >
//               {presentation.status || 'draft'}
//             </Badge>
//             {presentation.duration && (
//               <Badge variant="secondary" className="gap-1">
//                 <Clock className="h-3 w-3" />
//                 {presentation.duration} min
//               </Badge>
//             )}
//             <Badge variant="outline" className="gap-1">
//               <Calendar className="h-3 w-3" />
//               Order: {presentation.order || 1}
//             </Badge>
//           </div>
//         </div>
        
//         <div className="flex gap-2">
//           <Button variant="outline" onClick={handleEdit}>
//             <Edit className="h-4 w-4 mr-2" />
//             Edit
//           </Button>
//           <Button variant="destructive" onClick={handleDelete}>
//             <Trash className="h-4 w-4 mr-2" />
//             Delete
//           </Button>
//         </div>
//       </div>

//       {/* Content */}
//       <div className="space-y-6">
//         {/* Abstract */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <FileText className="h-5 w-5" />
//               Abstract
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
//               {presentation.abstract || "No abstract provided."}
//             </p>
//           </CardContent>
//         </Card>

//         {/* Keywords */}
//         {presentation.keywords && presentation.keywords.length > 0 && (
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Tag className="h-5 w-5" />
//                 Keywords
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="flex flex-wrap gap-2">
//                 {presentation.keywords.map((keyword: string, index: number) => (
//                   <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
//                     {keyword}
//                   </Badge>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Authors */}
//         {presentation.authors && presentation.authors.length > 0 && (
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Users className="h-5 w-5" />
//                 Authors ({presentation.authors.length})
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-3">
//                 {presentation.authors.map((author: any, index: number) => (
//                   <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="font-medium">{author.name}</p>
//                       <p className="text-sm text-gray-500">{author.email}</p>
//                       {author.affiliation && (
//                         <p className="text-sm text-gray-500">{author.affiliation}</p>
//                       )}
//                     </div>
//                     {author.isPresenter && (
//                       <Badge variant="default" className="bg-primary-600">
//                         Presenter
//                       </Badge>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Materials */}
//         {presentation.materials && presentation.materials.length > 0 && (
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <FileText className="h-5 w-5" />
//                 Materials ({presentation.materials.length})
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-3">
//                 {presentation.materials.map((material: any) => (
//                   <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="font-medium">{material.name}</p>
//                       <p className="text-sm text-gray-500 capitalize">{material.type}</p>
//                       {material.uploadedAt && (
//                         <p className="text-xs text-gray-400">
//                           Uploaded: {formatDate(material.uploadedAt)}
//                         </p>
//                       )}
//                     </div>
//                     <Button variant="outline" size="sm">
//                       <Download className="h-4 w-4 mr-2" />
//                       Download
//                     </Button>
//                   </div>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Presentation Details */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Presentation Details</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-2 gap-4 text-sm">
//               <div>
//                 <p className="font-medium text-gray-500">Created</p>
//                 <p>{presentation.createdAt ? formatDate(presentation.createdAt) : "Unknown"}</p>
//               </div>
//               <div>
//                 <p className="font-medium text-gray-500">Duration</p>
//                 <p>{presentation.duration ? `${presentation.duration} minutes` : "Not specified"}</p>
//               </div>
//               <div>
//                 <p className="font-medium text-gray-500">Status</p>
//                 <p className="capitalize">{presentation.status || "Draft"}</p>
//               </div>
//               <div>
//                 <p className="font-medium text-gray-500">Order in Session</p>
//                 <p>#{presentation.order || 1}</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Action Buttons */}
//       <div className="flex justify-between items-center mt-8 pt-6 border-t">
//         <Button 
//           variant="outline" 
//           onClick={() => router.push(`/organizer/events/${eventId}/sessions/${sessionId}`)}
//         >
//           <ArrowLeft className="h-4 w-4 mr-2" />
//           Back to Session
//         </Button>
        
//         <div className="flex gap-2">
//           <Button 
//             variant="outline"
//             onClick={() => router.push(`/organizer/events/${eventId}/sessions/${sessionId}/presentations`)}
//           >
//             <FileText className="h-4 w-4 mr-2" />
//             Manage All Presentations
//           </Button>
//           <Button onClick={handleEdit} className="bg-primary-700 text-white hover:bg-primary-800">
//             <Edit className="h-4 w-4 mr-2" />
//             Edit Presentation
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }


