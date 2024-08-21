document.addEventListener("DOMContentLoaded", function() {
    const menuItems = document.querySelectorAll(".menu-item");

    // Function to load content based on menu item selection
    function loadContent(target) {
        let content = "";
        switch (target) {
            case "home":
                content = `
                    <div id="addNewContent">
                        <h2>Add New Content</h2>
                        <form id="newContentForm">
                            <div class="form-row">
                                <div class="col-md-6 mb-3">
                                    <label for="imageInput">Image:</label>
                                    <div id="imagePreviewContainer" class="image-preview">
                                        <img id="previewImage" src="#" alt="Image Preview">
                                        <input type="file" id="imageInput" accept="image/*" style="display: none;">
                                    </div>
                                    <button type="button" id="chooseImageButton" class="btn btn-secondary mt-2">Choose Image</button>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="diseaseNameInput">Disease Name:</label>
                                        <input type="text" class="form-control" id="diseaseNameInput" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="symptomsInput">Symptoms:</label>
                                        <textarea class="form-control" id="symptomsInput" rows="3" required></textarea>
                                    </div>
                                    <div class="form-group">
                                        <label for="descriptionInput">Description:</label>
                                        <textarea class="form-control" id="descriptionInput" rows="5" required></textarea>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">Submit</button>
                        </form>
                    </div>
                `;
                break;
            case "listings":
                content = `
                    <div id="previousListings">
                        <input type="text" id="searchInput" placeholder="Search by name...">
                        <div id="listingContainer"></div>
                    </div>
                `;
                fetchPreviousListings();
                break;
            case "contact":
                displayApprovals();
                break;
            default:
                content = `
                    <p>Welcome! Select a menu item to see its content.</p>
                `;
                break;
        }
        document.getElementById("content").innerHTML = content;

        // Highlight the selected menu item
        menuItems.forEach(item => {
            if (item.getAttribute("data-target") === target) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Event listener for image selection button
        const chooseImageButton = document.getElementById("chooseImageButton");
        const imageInput = document.getElementById("imageInput");
        const previewImage = document.getElementById("previewImage");
        if (chooseImageButton && imageInput && previewImage) {
            chooseImageButton.addEventListener("click", function() {
                imageInput.click(); // Trigger file input when button is clicked
            });

            // Preview selected image
            imageInput.addEventListener("change", function() {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        previewImage.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    // Initial load of content (home page)
    loadContent("home");

    // Event listener for menu item clicks
    menuItems.forEach(function(item) {
        item.addEventListener("click", function(event) {
            event.preventDefault();
            const target = item.getAttribute("data-target");
            loadContent(target);

            // Highlight the selected menu item
            menuItems.forEach(function(menuItem) {
                menuItem.classList.remove("active");
            });
            item.classList.add("active");
        });
    });

    // Event listener for form submission (Add New Content)
    const newContentForm = document.getElementById("newContentForm");
    if (newContentForm) {
        newContentForm.addEventListener("submit", function(event) {
            event.preventDefault(); // Prevent default form submission behavior
            const diseaseName = document.getElementById("diseaseNameInput").value.trim();
            const symptoms = document.getElementById("symptomsInput").value.trim();
            const description = document.getElementById("descriptionInput").value.trim();
            const imageFile = document.getElementById("imageInput").files[0];

            if (!diseaseName || !symptoms || !description || !imageFile) {
                alert('Please fill in all fields and select an image.');
                return;
            }

            // Upload image to Firebase Storage
            const storageRef = firebase.storage().ref();
            const imageRef = storageRef.child(`images/${imageFile.name}`);

            imageRef.put(imageFile)
                .then((snapshot) => {
                    return snapshot.ref.getDownloadURL();
                })
                .then((imageUrl) => {
                    // Store data in Firestore
                    const curesCollection = firebase.firestore().collection('cures');
                    return curesCollection.doc(diseaseName).set({
                        symptoms: symptoms,
                        description: description,
                        imageUrl: imageUrl
                    });
                })
                .then(() => {
                    alert('Data Added Successfully.');
                    newContentForm.reset();
                    document.getElementById('previewImage').src = '#';
                })
                .catch((error) => {
                    console.error('Error adding cure details:', error);
                    alert('An error occurred. Please try again.');
                });
        });
    }
    function displayApprovals() {
        const approvalsContainer = document.getElementById('content');
        approvalsContainer.innerHTML = "";
    
        const usersRef = firebase.database().ref('users');
    
        usersRef.once('value', (snapshot) => {
            let hasApprovals = false;
    
            snapshot.forEach((childSnapshot) => {
                const userData = childSnapshot.val();
                const email = userData.email;
                const name = userData.name;
                const password = userData.password;
                const approved = userData.approved || 'no';
                const idProofURL = userData.idProofURL; // Assuming ID proof URL is stored in the database
    
                if (approved === 'no') {
                    hasApprovals = true;
    
                    const approvalDiv = document.createElement('div');
                    approvalDiv.classList.add('approvalItem');
    
                    const emailNameParagraph = document.createElement('p');
                    emailNameParagraph.textContent = `${email} - ${name}`;
                    approvalDiv.appendChild(emailNameParagraph);
    
                    const viewButton = document.createElement('button');
                    viewButton.textContent = 'View ID Proof';
                    viewButton.addEventListener('click', () => {
                        if (idProofURL) {
                            window.open(idProofURL); // Open ID proof image in a new tab/window
                        } else {
                            alert('ID proof not available.');
                        }
                    });
                    approvalDiv.appendChild(viewButton);
    
                    const approveButton = document.createElement('button');
                    approveButton.textContent = 'Approve';
                    approveButton.addEventListener('click', () => {
                        usersRef.child(childSnapshot.key).update({ approved: 'yes' })
                            .then(() => {
                                createAuthentication(email, password);
                                approvalDiv.remove();
                                if (!approvalsContainer.querySelector('.approvalItem')) {
                                    approvalsContainer.innerHTML = "<p>No pending approvals.</p>";
                                }
                            })
                            .catch((error) => {
                                console.error('Error updating approval status:', error);
                            });
                    });
                    approvalDiv.appendChild(approveButton);
    
                    const rejectButton = document.createElement('button');
                    rejectButton.textContent = 'Reject';
                    rejectButton.addEventListener('click', () => {
                        confirmAndDelete(email);
                    });
                    approvalDiv.appendChild(rejectButton);
    
                    approvalsContainer.appendChild(approvalDiv);
                }
            });
    
            if (!hasApprovals) {
                approvalsContainer.innerHTML = "<p>No pending approvals.</p>";
            }
        });
    }
    
    
    function createAuthentication(email, password) {
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                alert(`Authentication created for ${email}`);
            })
            .catch((error) => {
                console.error(`Error creating authentication for ${email}: ${error.message}`);
                alert(`Error creating authentication: ${error.message}`);
            });
    }        
    
    function confirmAndDelete(email) {
        const confirmed = confirm(`Are you sure you want to delete ${email}?`);
        if (confirmed) {
            const usersRef = firebase.database().ref('users');
    
            usersRef.child(email).remove()
                .then(() => {
                    alert(`User ${email} deleted successfully.`);
                    displayApprovals();
                })
                .catch((error) => {
                    console.error('Error deleting user:', error);
                    alert('An error occurred while deleting user. Please try again.');
                });
        }
    }
});

// Function to sign out user (redirect to login page)
function signOut() {
    window.location.href = 'login.html';
}
