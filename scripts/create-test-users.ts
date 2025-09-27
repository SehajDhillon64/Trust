import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/types/database'

// Supabase configuration
const supabaseUrl = 'https://qqcauorhdutkszufvrlm.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxY2F1b3JoZHV0a3N6dWZ2cmxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1Mjk0MCwiZXhwIjoyMDY5NzI4OTQwfQ.0a8JHBlmN7tqpwEm_RVbVzuNBpzzjtczqvk2JWIohHE'

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'your-supabase-url') {
  process.exit(1)
}

if (!supabaseServiceKey || supabaseServiceKey === 'your-service-role-key') {
  process.exit(1)
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  process.exit(1)
}

// Create Supabase client with service role key for admin operations
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test user data for each role
const testUsers = [
  {
    email: 'admin@testfacility.com',
    password: 'TestAdmin123!',
    name: 'Test Admin User',
    role: 'Admin' as const,
    facilityId: null // Admins don't belong to a specific facility
  },
  {
    email: 'om@sunrisemanor.com',
    password: 'TestOM123!',
    name: 'Sarah Johnson',
    role: 'OM' as const,
    facilityId: null // Will be set after getting facility
  },
  {
    email: 'om@goldenyears.com',
    password: 'TestOM123!',
    name: 'Mike Wilson',
    role: 'OM' as const,
    facilityId: null // Will be set after getting facility
  },
  {
    email: 'poa1@example.com',
    password: 'TestPOA123!',
    name: 'Jennifer Smith',
    role: 'POA' as const,
    facilityId: null // Will be set after getting facility
  },
  {
    email: 'poa2@example.com',
    password: 'TestPOA123!',
    name: 'Robert Johnson',
    role: 'POA' as const,
    facilityId: null // Will be set after getting facility
  },
  {
    email: 'resident1@example.com',
    password: 'TestResident123!',
    name: 'Mary Thompson',
    role: 'Resident' as const,
    facilityId: null // Will be set after getting facility
  },
  {
    email: 'resident2@example.com',
    password: 'TestResident123!',
    name: 'John Davis',
    role: 'Resident' as const,
    facilityId: null // Will be set after getting facility
  }
]

async function createTestUser(userData: typeof testUsers[0]) {
  try {
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    })

    if (authError) {
      return null
    }

    if (!authData.user) {
      return null
    }

    // Create user profile
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        facility_id: userData.facilityId,
        auth_user_id: authData.user.id
      })
      .select()
      .single()

    if (userError) {
      // Clean up auth user if database insertion fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return null
    }

    return { authUser: authData.user, dbUser }
  } catch (error) {
    return null
  }
}

async function getFacilities() {
  try {
    const { data: facilities, error } = await supabase
      .from('facilities')
      .select('*')
      .order('name')

    if (error) {
      return []
    }

    return facilities
  } catch (error) {
    return []
  }
}

async function createSampleResidents(facilityId: string, residentUsers: any[]) {
  const residents = [
    {
      residentId: 'RES001',
      name: 'Mary Thompson',
      dob: '1945-03-15',
      trustBalance: 1250.00,
      isSelfManaged: true,
      linkedUserId: residentUsers.find(u => u.dbUser.email === 'resident1@example.com')?.dbUser.id,
      ltcUnit: 'A-101',
      status: 'active' as const,
      facilityId: facilityId,
      allowedServices: {
        haircare: true,
        footcare: true,
        pharmacy: true,
        cable: false,
        wheelchairRepair: false,
        miscellaneous: false
      }
    },
    {
      residentId: 'RES002',
      name: 'John Davis',
      dob: '1938-11-22',
      trustBalance: 875.50,
      isSelfManaged: true,
      linkedUserId: residentUsers.find(u => u.dbUser.email === 'resident2@example.com')?.dbUser.id,
      ltcUnit: 'B-205',
      status: 'active' as const,
      facilityId: facilityId,
      allowedServices: {
        haircare: false,
        footcare: true,
        pharmacy: true,
        cable: true,
        wheelchairRepair: true,
        miscellaneous: true
      }
    },
    {
      residentId: 'RES003',
      name: 'Eleanor Wilson',
      dob: '1942-07-08',
      trustBalance: 2100.75,
      isSelfManaged: false,
      linkedUserId: null, // This resident will be managed by POA
      ltcUnit: 'A-203',
      status: 'active' as const,
      facilityId: facilityId,
      allowedServices: {
        haircare: true,
        footcare: true,
        pharmacy: true,
        cable: true,
        wheelchairRepair: false,
        miscellaneous: true
      }
    }
  ]

  
  for (const resident of residents) {
    try {
      const { data, error } = await supabase
        .from('residents')
        .insert({
          resident_id: resident.residentId,
          name: resident.name,
          dob: resident.dob,
          trust_balance: resident.trustBalance,
          is_self_managed: resident.isSelfManaged,
          linked_user_id: resident.linkedUserId,
          ltc_unit: resident.ltcUnit,
          status: resident.status,
          facility_id: resident.facilityId,
          allowed_services: resident.allowedServices
        })
        .select()
        .single()

      if (error) {
      } else {
      }
    } catch (error) {
    }
  }
}

async function main() {

  // Get existing facilities
  const facilities = await getFacilities()
  
  if (facilities.length === 0) {
    process.exit(1)
  }


  // Assign facilities to users
  const sunriseManor = facilities.find(f => f.unique_code === 'SM001')
  const goldenYears = facilities.find(f => f.unique_code === 'GY002')

  if (!sunriseManor || !goldenYears) {
    process.exit(1)
  }

  // Update user data with facility assignments
  testUsers[1].facilityId = sunriseManor.id // OM for Sunrise Manor
  testUsers[2].facilityId = goldenYears.id  // OM for Golden Years
  testUsers[3].facilityId = sunriseManor.id // POA for Sunrise Manor
  testUsers[4].facilityId = goldenYears.id  // POA for Golden Years
  testUsers[5].facilityId = sunriseManor.id // Resident for Sunrise Manor
  testUsers[6].facilityId = goldenYears.id  // Resident for Golden Years

  // Create users
  const createdUsers = []
  const failedUsers = []

  for (const userData of testUsers) {
    const result = await createTestUser(userData)
    if (result) {
      createdUsers.push(result)
    } else {
      failedUsers.push(userData.email)
    }
  }


  if (failedUsers.length > 0) {
  }

  // Create sample residents for testing
  const residentUsers = createdUsers.filter(u => u.dbUser.role === 'Resident')
  if (residentUsers.length > 0) {
    await createSampleResidents(sunriseManor.id, residentUsers)
  }

  
  testUsers.forEach(user => {
    const facilityName = user.facilityId === sunriseManor.id ? 'Sunrise Manor' : 
                        user.facilityId === goldenYears.id ? 'Golden Years' : 'N/A'
  })

  process.exit(0)
}

// Run the script
main().catch(error => {
  process.exit(1)
})