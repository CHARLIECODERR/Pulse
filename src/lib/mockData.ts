export interface User {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    bio: string;
    followers: number;
    following: number;
    posts: number;
    isVerified: boolean;
    isFollowing: boolean;
}

export interface Post {
    id: string;
    author: User;
    image: string;
    caption: string;
    tags: string[];
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
    isBookmarked: boolean;
    timeAgo: string;
    aspectRatio: "square" | "portrait" | "landscape";
}

export interface Story {
    id: string;
    user: User;
    isViewed: boolean;
    hasNew: boolean;
}

export interface Comment {
    id: string;
    author: User;
    body: string;
    likes: number;
    timeAgo: string;
}

export interface Notification {
    id: string;
    type: "like" | "comment" | "follow" | "mention";
    actor: User;
    postImage?: string;
    message: string;
    timeAgo: string;
    isRead: boolean;
}

const seedUsers: User[] = [
    {
        id: "u1",
        username: "arjun.sharma",
        displayName: "Arjun Sharma",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=arjun&backgroundColor=b6e3f4",
        bio: "📸 Street photographer | Mumbai | Capturing moments",
        followers: 12400,
        following: 342,
        posts: 89,
        isVerified: true,
        isFollowing: false,
    },
    {
        id: "u2",
        username: "priya.kapoor",
        displayName: "Priya Kapoor",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=priya&backgroundColor=ffdfbf",
        bio: "✨ Lifestyle | Travel | Food lover 🍜",
        followers: 8900,
        following: 512,
        posts: 142,
        isVerified: false,
        isFollowing: true,
    },
    {
        id: "u3",
        username: "vikas.dev",
        displayName: "Vikas Dev",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=vikas&backgroundColor=c0aede",
        bio: "💻 Full-stack dev | Building cool stuff | Chai ☕",
        followers: 5600,
        following: 280,
        posts: 53,
        isVerified: false,
        isFollowing: true,
    },
    {
        id: "u4",
        username: "meera.arts",
        displayName: "Meera Arts",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=meera&backgroundColor=ffd5dc",
        bio: "🎨 Artist | Illustrator | Colors make me happy",
        followers: 23100,
        following: 187,
        posts: 210,
        isVerified: true,
        isFollowing: false,
    },
    {
        id: "u5",
        username: "rohan.fit",
        displayName: "Rohan Fitness",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=rohan&backgroundColor=d1f4d1",
        bio: "💪 Certified trainer | Nutrition | Motivation",
        followers: 31200,
        following: 423,
        posts: 176,
        isVerified: true,
        isFollowing: false,
    },
    {
        id: "u6",
        username: "anika.bakes",
        displayName: "Anika Sharma",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=anika&backgroundColor=ffe4b5",
        bio: "🧁 Baker | Dessert queen | Love sharing recipes",
        followers: 9300,
        following: 615,
        posts: 98,
        isVerified: false,
        isFollowing: true,
    },
    {
        id: "me",
        username: "you",
        displayName: "You",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=you&backgroundColor=a0d9f8",
        bio: "Just here vibing 🌊 | Explorer",
        followers: 412,
        following: 203,
        posts: 17,
        isVerified: false,
        isFollowing: false,
    },
];

export const currentUser = seedUsers.find((u) => u.id === "me")!;

export const mockUsers: User[] = seedUsers.filter((u) => u.id !== "me");

export const mockPosts: Post[] = [
    {
        id: "p1",
        author: seedUsers[0],
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        caption: "Found this hidden gem in the mountains 🏔️ Some places remind you that the world is still magic. #Mountains #Travel #Photography",
        tags: ["Mountains", "Travel", "Photography"],
        likes: 4821,
        comments: 87,
        shares: 34,
        isLiked: false,
        isBookmarked: false,
        timeAgo: "2h ago",
        aspectRatio: "portrait",
    },
    {
        id: "p2",
        author: seedUsers[1],
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
        caption: "Sunday brunch hits different when you take your time with it ☕🥞 Recipe in bio! #FoodPhotography #Brunch #Foodie",
        tags: ["FoodPhotography", "Brunch", "Foodie"],
        likes: 2341,
        comments: 45,
        shares: 12,
        isLiked: true,
        isBookmarked: true,
        timeAgo: "4h ago",
        aspectRatio: "square",
    },
    {
        id: "p3",
        author: seedUsers[3],
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80",
        caption: "New piece finished! 🎨 Been working on this watercolour for 3 weeks — happy with how it turned out. #Art #Watercolour #Illustration",
        tags: ["Art", "Watercolour", "Illustration"],
        likes: 8764,
        comments: 231,
        shares: 89,
        isLiked: false,
        isBookmarked: false,
        timeAgo: "6h ago",
        aspectRatio: "square",
    },
    {
        id: "p4",
        author: seedUsers[4],
        image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
        caption: "Morning workout done ✅ No excuses. Just results. Make it happen today! 💪 #Fitness #MorningWorkout #Motivation",
        tags: ["Fitness", "MorningWorkout", "Motivation"],
        likes: 12300,
        comments: 342,
        shares: 145,
        isLiked: true,
        isBookmarked: false,
        timeAgo: "8h ago",
        aspectRatio: "landscape",
    },
    {
        id: "p5",
        author: seedUsers[5],
        image: "https://images.unsplash.com/photo-1542691457-13a7e5702e8b?w=800&q=80",
        caption: "Birthday cake order for the weekend 🎂🎉 Chocolate fudge with gold drip. Swipe to see the inside! #Baking #CakeDesign #Dessert",
        tags: ["Baking", "CakeDesign", "Dessert"],
        likes: 3478,
        comments: 167,
        shares: 54,
        isLiked: false,
        isBookmarked: true,
        timeAgo: "10h ago",
        aspectRatio: "portrait",
    },
    {
        id: "p6",
        author: seedUsers[2],
        image: "https://images.unsplash.com/photo-1593720219276-0b1eacd0aef4?w=800&q=80",
        caption: "Late night coding session 🌙 Built this feature in 4 hours while listening to lo-fi. Ship it! #Dev #Code #BuildInPublic",
        tags: ["Dev", "Code", "BuildInPublic"],
        likes: 1892,
        comments: 78,
        shares: 31,
        isLiked: false,
        isBookmarked: false,
        timeAgo: "1d ago",
        aspectRatio: "landscape",
    },
];

export const mockStories: Story[] = [
    { id: "s1", user: seedUsers[1], isViewed: false, hasNew: true },
    { id: "s2", user: seedUsers[3], isViewed: false, hasNew: true },
    { id: "s3", user: seedUsers[4], isViewed: true, hasNew: false },
    { id: "s4", user: seedUsers[0], isViewed: false, hasNew: true },
    { id: "s5", user: seedUsers[5], isViewed: true, hasNew: false },
    { id: "s6", user: seedUsers[2], isViewed: false, hasNew: true },
];

export const mockComments: Record<string, Comment[]> = {
    p1: [
        { id: "c1", author: seedUsers[1], body: "This is absolutely breathtaking! 😍 Where is this?", likes: 45, timeAgo: "1h ago" },
        { id: "c2", author: seedUsers[2], body: "Incredible shot, the lighting is perfect 🔥", likes: 23, timeAgo: "1h ago" },
        { id: "c3", author: seedUsers[3], body: "Adding this to my travel bucket list!", likes: 12, timeAgo: "2h ago" },
    ],
    p2: [
        { id: "c4", author: seedUsers[0], body: "Looks so delicious! Please share the recipe 🙏", likes: 34, timeAgo: "3h ago" },
        { id: "c5", author: seedUsers[4], body: "Sunday vibes ✨", likes: 8, timeAgo: "4h ago" },
    ],
    p3: [
        { id: "c6", author: seedUsers[0], body: "Your talent is absolutely stunning! 🎨", likes: 128, timeAgo: "5h ago" },
        { id: "c7", author: seedUsers[2], body: "I wish I could paint like this!", likes: 67, timeAgo: "5h ago" },
        { id: "c8", author: seedUsers[5], body: "The colours are so vivid and beautiful", likes: 52, timeAgo: "6h ago" },
    ],
};

export const mockNotifications: Notification[] = [
    { id: "n1", type: "like", actor: seedUsers[0], postImage: mockPosts[1].image, message: "liked your photo", timeAgo: "2m ago", isRead: false },
    { id: "n2", type: "follow", actor: seedUsers[3], message: "started following you", timeAgo: "15m ago", isRead: false },
    { id: "n3", type: "comment", actor: seedUsers[1], postImage: mockPosts[0].image, message: 'commented: "This is stunning! 😍"', timeAgo: "1h ago", isRead: false },
    { id: "n4", type: "like", actor: seedUsers[4], postImage: mockPosts[0].image, message: "liked your photo", timeAgo: "2h ago", isRead: true },
    { id: "n5", type: "follow", actor: seedUsers[2], message: "started following you", timeAgo: "3h ago", isRead: true },
    { id: "n6", type: "mention", actor: seedUsers[5], postImage: mockPosts[1].image, message: "mentioned you in a comment", timeAgo: "5h ago", isRead: true },
    { id: "n7", type: "like", actor: seedUsers[0], postImage: mockPosts[2].image, message: "and 24 others liked your post", timeAgo: "8h ago", isRead: true },
];

export const explorePosts = [
    { id: "e1", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=80", likes: 3241 },
    { id: "e2", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80", likes: 8712 },
    { id: "e3", image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80", likes: 1234 },
    { id: "e4", image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80", likes: 5678 },
    { id: "e5", image: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=400&q=80", likes: 2345 },
    { id: "e6", image: "https://images.unsplash.com/photo-1542010589005-d1eacc3918f2?w=400&q=80", likes: 9210 },
    { id: "e7", image: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400&q=80", likes: 4532 },
    { id: "e8", image: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80", likes: 6789 },
    { id: "e9", image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80", likes: 3456 },
];

export const trendingTags = ["Photography", "Travel", "Art", "Fitness", "Food", "Fashion", "Music", "Tech", "Nature", "Vibes"];

export const formatCount = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
};
