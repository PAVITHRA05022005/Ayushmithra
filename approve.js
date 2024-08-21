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